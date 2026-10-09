const SIZE = 21;
const DATA_CODEWORDS = 19;
const ERROR_CODEWORDS = 7;
const MAX_PAYLOAD_LENGTH = 17;

type MatrixCell = boolean | null;

function multiply(left: number, right: number): number {
  let product = 0;
  let multiplicand = left;
  let multiplier = right;
  while (multiplier > 0) {
    if ((multiplier & 1) !== 0) product ^= multiplicand;
    multiplicand <<= 1;
    if ((multiplicand & 0x100) !== 0) multiplicand ^= 0x11d;
    multiplier >>= 1;
  }
  return product;
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let shift = length - 1; shift >= 0; shift--) bits.push((value >>> shift) & 1);
}

function encodeData(payload: string): number[] {
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, payload.length, 8);
  for (const character of payload) appendBits(bits, character.codePointAt(0) ?? 0, 8);

  const capacity = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    codewords.push(bits.slice(index, index + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }

  let pad = 0xec;
  while (codewords.length < DATA_CODEWORDS) {
    codewords.push(pad);
    pad ^= 0xec ^ 0x11;
  }
  return codewords;
}

function errorCorrection(data: readonly number[]): number[] {
  let generator = [1];
  let root = 1;
  for (let degree = 0; degree < ERROR_CODEWORDS; degree++) {
    const next = new Array<number>(generator.length + 1).fill(0);
    generator.forEach((coefficient, index) => {
      next[index] ^= coefficient;
      next[index + 1] ^= multiply(coefficient, root);
    });
    generator = next;
    root = multiply(root, 2);
  }

  const remainder = new Array<number>(ERROR_CODEWORDS).fill(0);
  for (const codeword of data) {
    const factor = codeword ^ (remainder.shift() ?? 0);
    remainder.push(0);
    for (let index = 0; index < ERROR_CODEWORDS; index++) {
      remainder[index] = (remainder[index] ?? 0) ^ multiply(generator[index + 1] ?? 0, factor);
    }
  }
  return remainder;
}

function setFunctionCell(matrix: MatrixCell[][], x: number, y: number, value: boolean): void {
  const row = matrix[y];
  if (row) row[x] = value;
}

function addFinder(matrix: MatrixCell[][], left: number, top: number): void {
  for (let y = -1; y <= 7; y++) {
    for (let x = -1; x <= 7; x++) {
      const moduleX = left + x;
      const moduleY = top + y;
      if (moduleX < 0 || moduleX >= SIZE || moduleY < 0 || moduleY >= SIZE) continue;
      const distance = Math.max(Math.abs(x - 3), Math.abs(y - 3));
      setFunctionCell(matrix, moduleX, moduleY, distance !== 2 && distance !== 4);
    }
  }
}

function addFormatBits(matrix: MatrixCell[][]): void {
  const formatData = 0b01000;
  let remainder = formatData << 10;
  for (let bit = 14; bit >= 10; bit--) {
    if (((remainder >>> bit) & 1) !== 0) remainder ^= 0x537 << (bit - 10);
  }
  const formatBits = ((formatData << 10) | remainder) ^ 0x5412;
  const bitAt = (index: number) => ((formatBits >>> index) & 1) !== 0;

  for (let index = 0; index <= 5; index++) setFunctionCell(matrix, 8, index, bitAt(index));
  setFunctionCell(matrix, 8, 7, bitAt(6));
  setFunctionCell(matrix, 8, 8, bitAt(7));
  setFunctionCell(matrix, 7, 8, bitAt(8));
  for (let index = 9; index < 15; index++) setFunctionCell(matrix, 14 - index, 8, bitAt(index));

  for (let index = 0; index < 8; index++) setFunctionCell(matrix, SIZE - 1 - index, 8, bitAt(index));
  for (let index = 8; index < 15; index++) setFunctionCell(matrix, 8, SIZE - 15 + index, bitAt(index));
  setFunctionCell(matrix, 8, SIZE - 8, true);
}

function isValidPayload(payload: string): boolean {
  return (
    payload.length > 0 &&
    payload.length <= MAX_PAYLOAD_LENGTH &&
    [...payload].every((character) => (character.codePointAt(0) ?? 0) <= 0x7f)
  );
}

function placeDataBits(matrix: MatrixCell[][], bits: readonly number[]): void {
  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1;) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < SIZE; vertical++) {
      const y = upward ? SIZE - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        if (matrix[y]?.[x] !== null) continue;
        const value = (bits[bitIndex++] ?? 0) !== 0;
        setFunctionCell(matrix, x, y, value !== ((x + y) % 2 === 0));
      }
    }
    upward = !upward;
    right -= 2;
  }
}

function buildMatrix(codewords: readonly number[]): boolean[][] {
  const bits = codewords.flatMap((codeword) => Array.from({ length: 8 }, (_, index) => (codeword >>> (7 - index)) & 1));
  const matrix: MatrixCell[][] = Array.from({ length: SIZE }, () => new Array<MatrixCell>(SIZE).fill(null));

  addFinder(matrix, 0, 0);
  addFinder(matrix, SIZE - 7, 0);
  addFinder(matrix, 0, SIZE - 7);
  for (let index = 8; index < SIZE - 8; index++) {
    setFunctionCell(matrix, 6, index, index % 2 === 0);
    setFunctionCell(matrix, index, 6, index % 2 === 0);
  }
  addFormatBits(matrix);
  placeDataBits(matrix, bits);
  return matrix.map((row) => row.map((cell) => cell ?? false));
}

/**
 * Encode a short ASCII label reference as a version 1-L QR matrix.
 *
 * @param payload Stable, non-sensitive label reference (up to 17 ASCII characters).
 * @returns A 21 by 21 matrix where true cells are dark modules.
 * @throws RangeError when the payload is empty, unsupported, or exceeds version 1-L capacity.
 */
export function encodeLabelQr(payload: string): boolean[][] {
  if (!isValidPayload(payload)) {
    throw new RangeError(`encodeLabelQr: payload must contain 1-${MAX_PAYLOAD_LENGTH} ASCII characters`);
  }

  const data = encodeData(payload);
  return buildMatrix([...data, ...errorCorrection(data)]);
}

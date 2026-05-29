/**
 * Sprint 245 — Half-lap joint calculator.
 *
 * The half-lap joint removes exactly half the thickness from each mating member
 * so the finished joint is flush on both faces.  Three common variants:
 *
 * - END_LAP:   Notch at the end of each piece.  Both notches are the same width
 *              (equal to the mating board width).
 * - T_LAP:     One piece is notched in the middle; the other at its end.
 *              The notch width equals the end-lapped member's width.
 * - CROSS_LAP: Both pieces are notched in the middle (crossing at any angle).
 *              The notch width of each piece equals the other piece's width.
 *
 * Formula (same for all variants):
 *   notchDepth      = boardThickness / 2
 *   notchWidth      = matingBoardWidthMm
 *   glueAreaOnePiece = notchDepth × notchWidth
 *   totalGlueArea   = glueAreaOnePiece × 2 (both mating faces)
 */

export type HalfLapType = 'end_lap' | 't_lap' | 'cross_lap';

export interface HalfLapInput {
  /** Thickness of the first board (mm) */
  board1ThicknessMm: number;
  /** Width of the first board (mm) */
  board1WidthMm: number;
  /** Thickness of the second (mating) board (mm) */
  board2ThicknessMm: number;
  /** Width of the second (mating) board (mm) */
  board2WidthMm: number;
  /** Joint variant */
  lapType: HalfLapType;
}

export interface HalfLapResult {
  /** Depth of the notch cut in board 1 (mm) — exactly half its thickness */
  board1NotchDepthMm: number;
  /** Width of the notch cut in board 1 (mm) — equals board 2 width */
  board1NotchWidthMm: number;
  /** Depth of the notch cut in board 2 (mm) — exactly half its thickness */
  board2NotchDepthMm: number;
  /** Width of the notch cut in board 2 (mm) — equals board 1 width */
  board2NotchWidthMm: number;
  /** Glue surface area on board 1's notch face (mm²) */
  board1GlueAreaMm2: number;
  /** Glue surface area on board 2's notch face (mm²) */
  board2GlueAreaMm2: number;
  /** Combined glue area for the joint (mm²) */
  totalGlueAreaMm2: number;
  /** Finished thickness of the joint (= the thicker board's thickness) */
  finishedThicknessMm: number;
}

export function calculateHalfLap(input: HalfLapInput): HalfLapResult {
  const { board1ThicknessMm, board1WidthMm, board2ThicknessMm, board2WidthMm } = input;

  if (board1ThicknessMm <= 0) {
    throw new RangeError('board1ThicknessMm must be greater than 0');
  }
  if (board1WidthMm <= 0) {
    throw new RangeError('board1WidthMm must be greater than 0');
  }
  if (board2ThicknessMm <= 0) {
    throw new RangeError('board2ThicknessMm must be greater than 0');
  }
  if (board2WidthMm <= 0) {
    throw new RangeError('board2WidthMm must be greater than 0');
  }

  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  const board1NotchDepthMm = round3(board1ThicknessMm / 2);
  const board1NotchWidthMm = round3(board2WidthMm);

  const board2NotchDepthMm = round3(board2ThicknessMm / 2);
  const board2NotchWidthMm = round3(board1WidthMm);

  const board1GlueAreaMm2 = round3(board1NotchDepthMm * board1NotchWidthMm);
  const board2GlueAreaMm2 = round3(board2NotchDepthMm * board2NotchWidthMm);
  const totalGlueAreaMm2 = round3(board1GlueAreaMm2 + board2GlueAreaMm2);

  const finishedThicknessMm = round3(Math.max(board1ThicknessMm, board2ThicknessMm));

  return {
    board1NotchDepthMm,
    board1NotchWidthMm,
    board2NotchDepthMm,
    board2NotchWidthMm,
    board1GlueAreaMm2,
    board2GlueAreaMm2,
    totalGlueAreaMm2,
    finishedThicknessMm,
  };
}

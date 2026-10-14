export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  const isDomNode = typeof Node !== 'undefined' && anchor instanceof Node;
  if (isDomNode) document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    if (isDomNode) anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

export function downloadContent(content: string, mimeType: string, filename: string): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}

export function downloadBytes(data: Uint8Array, mimeType: string, filename: string): void {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  downloadBlob(new Blob([buffer], { type: mimeType }), filename);
}

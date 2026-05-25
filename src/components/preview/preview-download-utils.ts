/** Serialize the first <svg> inside a container element and trigger a download */
export function downloadSvg(container: HTMLElement, filename: string) {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rasterise the first <svg> inside container to a 2× PNG and trigger download. */
export function downloadPng(container: HTMLElement, filename: string) {
  const svgEl = container.querySelector('svg');
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgStr = clone.outerHTML;
  const viewBox = svgEl.viewBox.baseVal;
  const scale = 2;
  const w = (viewBox.width || svgEl.clientWidth) * scale;
  const h = (viewBox.height || svgEl.clientHeight) * scale;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
}

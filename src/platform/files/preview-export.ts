import { downloadBlob } from './download';

export function downloadSvg(container: HTMLElement, filename: string): void {
  const svgElement = container.querySelector('svg');
  if (!svgElement) return;
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  downloadBlob(new Blob([clone.outerHTML], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export function downloadPng(container: HTMLElement, filename: string): void {
  const svgElement = container.querySelector('svg');
  if (!svgElement) return;
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const svgString = clone.outerHTML;
  const viewBox = svgElement.viewBox.baseVal;
  const scale = 2;
  const width = (viewBox.width || svgElement.clientWidth) * scale;
  const height = (viewBox.height || svgElement.clientHeight) * scale;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, filename);
    }, 'image/png');
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
}

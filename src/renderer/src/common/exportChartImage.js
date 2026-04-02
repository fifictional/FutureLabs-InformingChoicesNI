import { toPng } from 'html-to-image';

function sanitizeFilenamePart(value) {
  return (
    String(value || 'chart')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'chart'
  );
}

export async function exportElementAsPng(element, name) {
  if (!element) {
    throw new Error('Nothing to export');
  }

  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    skipAutoScale: true
  });

  const anchor = document.createElement('a');
  anchor.download = `${sanitizeFilenamePart(name)}.png`;
  anchor.href = dataUrl;
  anchor.click();
}

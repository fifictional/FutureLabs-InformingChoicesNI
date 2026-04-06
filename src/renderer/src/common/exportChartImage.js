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

  // Let responsive charts settle before capture.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));

  const dataUrl = await toPng(element, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    quality: 1,
    width,
    height,
    style: {
      margin: '0',
      padding: '0'
    }
  });

  const anchor = document.createElement('a');
  anchor.download = `${sanitizeFilenamePart(name)}.png`;
  anchor.href = dataUrl;
  anchor.click();
}

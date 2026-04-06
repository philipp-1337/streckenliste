import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { Eintrag } from '@types';
import PrintContent from '@components/PrintContent';

// A4 landscape width in px at 96 dpi
const A4_LANDSCAPE_PX = 1122;

const usePdfExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [iosDownloadUrl, setIosDownloadUrl] = useState<string | null>(null);

  const clearIosDownload = () => {
    setIosDownloadUrl(null);
  };

  const exportPdf = async (eintraege: Eintrag[], jagdjahr: string, jagdbezirk: string) => {
    setIsExporting(true);

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // Mount PrintContent into an off-screen container so html-to-image can render it
    const exportClass = `pdf-export-${Date.now()}`;
    const container = document.createElement('div');
    container.className = exportClass;
    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4_LANDSCAPE_PX}px;background:#fff;overflow:visible;z-index:-1;`;
    document.body.appendChild(container);

    // Inject print-equivalent styles scoped to this container so row height matches the @media print output.
    // Critically: also reset line-height — Tailwind's text-xs sets line-height:1rem (16px) which inflates
    // row height vs the browser print engine which uses line-height:normal (~1.2×7pt ≈ 11px).
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .${exportClass} table { font-size: 7pt !important; line-height: normal !important; }
      .${exportClass} th, .${exportClass} td { font-size: 7pt !important; padding: 1px !important; line-height: normal !important; }
      .${exportClass} * { line-height: normal !important; }
    `;
    document.head.appendChild(styleEl);

    const root = createRoot(container);
    root.render(createElement(PrintContent, { eintraege, jagdjahr, jagdbezirk }));

    // Wait for React to render and fonts to settle
    await new Promise(r => setTimeout(r, 300));

    try {
      const el = container.firstElementChild as HTMLElement;
      if (!el) throw new Error('PrintContent not rendered');

      const pixelRatio = 2;

      // Capture row positions before toPng (same DOM state)
      const elRect = el.getBoundingClientRect();
      const rowBottomsPx = Array.from(el.querySelectorAll('tr')).map(row => {
        const rect = row.getBoundingClientRect();
        return (rect.bottom - elRect.top) * pixelRatio;
      });

      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);

      const dataUrl = await toPng(el, {
        pixelRatio,
        backgroundColor: '#ffffff',
        width: el.scrollWidth,
        height: el.scrollHeight,
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidthMm = pdf.internal.pageSize.getWidth();
      const pageHeightMm = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const printableW = pageWidthMm - margin * 2;
      const printableH = pageHeightMm - margin * 2;
      const mmPerPx = printableW / img.width;
      const pageHeightPx = Math.round(printableH / mmPerPx);

      // Row-aware slice points
      const slices: Array<{ start: number; end: number }> = [];
      let sliceStart = 0;
      while (sliceStart < img.height) {
        const maxEnd = sliceStart + pageHeightPx;
        if (maxEnd >= img.height) {
          slices.push({ start: sliceStart, end: img.height });
          break;
        }
        const fitting = rowBottomsPx.filter(b => b > sliceStart && b <= maxEnd);
        const cutAt = fitting.length > 0 ? fitting[fitting.length - 1] : maxEnd;
        slices.push({ start: sliceStart, end: Math.round(cutAt) });
        sliceStart = Math.round(cutAt);
      }

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = img.width;
      const sliceCtx = sliceCanvas.getContext('2d')!;

      for (let i = 0; i < slices.length; i++) {
        if (i > 0) pdf.addPage();
        const { start, end } = slices[i];
        const srcH = end - start;
        sliceCanvas.height = srcH;
        sliceCtx.fillStyle = '#ffffff';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, srcH);
        sliceCtx.drawImage(img, 0, start, img.width, srcH, 0, 0, img.width, srcH);
        pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, printableW, srcH * mmPerPx);
      }

      const filename = `Streckenliste_${(jagdjahr || 'Alle').replace('/', '-')}.pdf`;
      if (isIOS) {
        // blob: URLs are intercepted by the PWA service worker and fail with
        // WebKitBlobResource error 1. A self-contained data URI bypasses the SW entirely.
        const dataUri = pdf.output('datauristring');
        setIosDownloadUrl(dataUri);
      } else {
        pdf.save(filename);
      }
    } catch (err) {
      console.error('PDF Export fehlgeschlagen:', err);
    } finally {
      root.unmount();
      document.body.removeChild(container);
      document.head.removeChild(styleEl);
      setIsExporting(false);
    }
  };

  return { exportPdf, isExporting, iosDownloadUrl, clearIosDownload };
};

export default usePdfExport;

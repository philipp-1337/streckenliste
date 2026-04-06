import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import type { Eintrag } from '@types';
import PrintContent from '@components/PrintContent';

// A4 landscape width in px at 96 dpi
const A4_LANDSCAPE_PX = 1122;

const usePdfExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async (eintraege: Eintrag[], jagdjahr: string, jagdbezirk: string) => {
    setIsExporting(true);

    // Mount PrintContent into an off-screen container so html-to-image can render it
    const container = document.createElement('div');
    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4_LANDSCAPE_PX}px;background:#fff;overflow:visible;z-index:-1;`;
    document.body.appendChild(container);

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
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else {
        pdf.save(filename);
      }
    } catch (err) {
      console.error('PDF Export fehlgeschlagen:', err);
    } finally {
      root.unmount();
      document.body.removeChild(container);
      setIsExporting(false);
    }
  };

  return { exportPdf, isExporting };
};

export default usePdfExport;

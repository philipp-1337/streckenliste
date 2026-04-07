
import { useNavigate } from 'react-router-dom';
import { X, Printer, FileDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Eintrag } from '@types';
import useAuth from '@hooks/useAuth';
import usePdfExport from '@hooks/usePdfExport';
import PrintContent from '@components/PrintContent';
import PdfDownloadDialog from '@components/PdfDownloadDialog';
import Spinner from '@components/Spinner';

interface OfficialPrintViewProps {
  eintraege: Eintrag[];
  jagdjahr?: string;
}

const OfficialPrintView: React.FC<OfficialPrintViewProps> = ({ eintraege, jagdjahr }) => {
  const { currentUser } = useAuth();
  const jagdbezirk = currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || 'Unbekannt';
  const navigate = useNavigate();
  const [isPrinting, setIsPrinting] = useState(false);
  const { exportPdf, isExporting: isExportingPdf, iosPdfBlob, clearIosPdf } = usePdfExport();

  useEffect(() => {
    const handleAfterPrint = () => setIsPrinting(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  return (
    <>
      <style>{`
        .gewicht-header { position: relative; overflow: visible; }
        .gewicht-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          display: inline-block;
        }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; margin: 0; }
          .print-area { width: 100%; max-width: 100%; page-break-inside: avoid; padding: 15mm 10mm; }
          .print-container { page-break-inside: avoid; }
          table { width: 100%; font-size: 7pt !important; page-break-before: avoid; }
          th, td { padding: 1px !important; font-size: 7pt !important; }
          h1, p { page-break-after: avoid; }
          .print\\:hidden { display: none !important; }
          .gewicht-header { position: relative; vertical-align: middle; }
          .gewicht-text { position: relative; transform: rotate(180deg); transform-origin: center center; display: inline-block; width: auto; height: auto; }
        }
      `}</style>

      {iosPdfBlob && (
        <PdfDownloadDialog
          blob={iosPdfBlob}
          filename={`Streckenliste_${(jagdjahr || 'Alle').replace('/', '-')}.pdf`}
          onClose={clearIosPdf}
        />
      )}

      {/* PDF Export Loading Overlay */}
      {isExportingPdf && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
            <Spinner size={64} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">PDF wird erstellt...</h3>
            <p className="text-gray-600 text-sm">Einen Moment bitte.</p>
          </div>
        </div>
      )}

      {/* Print Loading Overlay */}
      {isPrinting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
            <Spinner size={64} className="mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Druckvorschau wird vorbereitet...</h3>
            <p className="text-gray-600 text-sm">
              Dies kann auf mobilen Geräten bis zu einer Minute dauern. Bitte haben Sie einen Moment Geduld.
            </p>
          </div>
        </div>
      )}

      <div className="print-area bg-white overflow-auto p-8">
        <div className="max-w-full text-xs print-container">
          <PrintContent eintraege={eintraege} jagdjahr={jagdjahr} jagdbezirk={jagdbezirk} />
        </div>
      </div>

      {/* Action Buttons */}
      {!isExportingPdf && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 print:hidden flex flex-col gap-3 z-[1002]">
          <button
            onClick={() => navigate(-1)}
            disabled={isPrinting}
            className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl shadow-lg border border-gray-200 font-medium transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2 cursor-pointer"
          >
            <X size={20} />
            Schließen
          </button>
          <button
            onClick={() => {
              setIsPrinting(true);
              setTimeout(() => {
                try {
                  if (!document.execCommand('print', false)) window.print();
                } catch {
                  window.print();
                }
                setTimeout(() => setIsPrinting(false), 3000);
              }, 300);
            }}
            disabled={isPrinting}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg font-medium transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
          >
            {isPrinting ? (
              <>
                <Spinner size={20} />
                Wird vorbereitet...
              </>
            ) : (
              <>
                <Printer size={20} />
                Drucken
              </>
            )}
          </button>
          <button
            onClick={() => exportPdf(eintraege, jagdjahr || '', jagdbezirk)}
            disabled={isPrinting}
            className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl shadow-lg font-medium transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileDown size={20} />
            PDF Export
          </button>
        </div>
      )}
    </>
  );
};

export default OfficialPrintView;

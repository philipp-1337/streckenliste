import { useState } from 'react';
import { FileDown, Printer, X } from 'lucide-react';
import Spinner from '@components/Spinner';

interface PdfDownloadDialogProps {
  blob: Blob;
  filename: string;
  onClose: () => void;
  onPrint?: () => void;
}

const PdfDownloadDialog: React.FC<PdfDownloadDialogProps> = ({ blob, filename, onClose, onPrint }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      await navigator.share({ files: [file], title: filename });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        onClose();
      } else {
        setError('PDF-Teilen wird auf diesem Gerät nicht unterstützt. Bitte öffne die App in Safari und versuche es erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
          <FileDown size={32} className="text-green-700" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">PDF ist fertig</h3>
        <p className="text-sm text-gray-500 mb-6">
          {isIos
            ? 'Tippe auf den Button um das PDF zu speichern oder zu teilen.'
            : 'Lade das PDF herunter oder öffne den Druckdialog.'}
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <div className="space-y-2.5">
          {isIos ? (
            <button
              onClick={handleShare}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Spinner size={20} /> : <FileDown size={20} />}
              {loading ? 'Wird vorbereitet...' : 'PDF speichern / teilen'}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors cursor-pointer"
            >
              <FileDown size={20} />
              PDF herunterladen
            </button>
          )}
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex items-center justify-center gap-2 w-full bg-white hover:bg-green-50 text-green-800 font-semibold py-3 px-4 rounded-xl border border-green-200 hover:border-green-300 transition-colors cursor-pointer"
            >
              <Printer size={20} />
              Drucken
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer py-1.5"
          >
            <X size={14} />
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfDownloadDialog;

import { useState } from 'react';
import { FileDown, Printer } from 'lucide-react';
import Spinner from '@components/Spinner';
import { DialogShell } from '@components/DialogShell';

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
    <DialogShell
      title="PDF ist fertig"
      description={isIos
        ? 'Speichere oder teile das Dokument über das Systemmenü.'
        : 'Lade das Dokument herunter oder öffne den Druckdialog.'}
      onClose={onClose}
      closeDisabled={loading}
      size="sm"
    >
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
          <FileDown size={32} className="text-green-700" />
        </div>
        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-left text-sm text-red-700">{error}</p>
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
        </div>
      </div>
    </DialogShell>
  );
};

export default PdfDownloadDialog;

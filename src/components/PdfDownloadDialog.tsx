import { useState } from 'react';
import { FileDown, X } from 'lucide-react';
import Spinner from '@components/Spinner';

interface PdfDownloadDialogProps {
  blob: Blob;
  filename: string;
  onClose: () => void;
}

const PdfDownloadDialog: React.FC<PdfDownloadDialogProps> = ({ blob, filename, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setLoading(true);
    setError(null);
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      // Call navigator.share directly without canShare() gate —
      // canShare() returns false on some iOS PWA versions even when share works.
      await navigator.share({ files: [file], title: filename });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User dismissed the share sheet — not an error
        onClose();
      } else {
        setError('PDF-Teilen wird auf diesem Gerät nicht unterstützt. Bitte öffne die App in Safari und versuche es erneut.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
          <FileDown size={32} className="text-green-700" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">PDF ist fertig</h3>
        <p className="text-sm text-gray-500 mb-6">
          Tippe auf den Button um das PDF zu speichern oder zu teilen.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}
        <button
          onClick={handleOpen}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors mb-3 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Spinner size={20} /> : <FileDown size={20} />}
          {loading ? 'Wird vorbereitet...' : 'PDF speichern / teilen'}
        </button>
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-1.5 w-full text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer py-1"
        >
          <X size={14} />
          Schließen
        </button>
      </div>
    </div>
  );
};

export default PdfDownloadDialog;

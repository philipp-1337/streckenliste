import { FileDown, X } from 'lucide-react';

interface PdfDownloadDialogProps {
  url: string;
  filename: string;
  onClose: () => void;
}

const PdfDownloadDialog: React.FC<PdfDownloadDialogProps> = ({ url, filename, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
          <FileDown size={32} className="text-green-700" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">PDF ist fertig</h3>
        <p className="text-sm text-gray-500 mb-6">
          Tippe auf den Button um das PDF zu öffnen.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={filename}
          onClick={onClose}
          className="block w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors mb-3"
        >
          PDF öffnen
        </a>
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

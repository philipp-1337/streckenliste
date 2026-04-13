import { useState } from 'react';
import { X } from 'lucide-react';

interface AblehnungsModalProps {
  eintragId: string;
  onConfirm: (id: string, grund: string) => Promise<void>;
  onClose: () => void;
}

export const AblehnungsModal: React.FC<AblehnungsModalProps> = ({ eintragId, onConfirm, onClose }) => {
  const [grund, setGrund] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!grund.trim()) return;
    setLoading(true);
    try {
      await onConfirm(eintragId, grund.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Eintrag ablehnen</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Bitte gib einen Grund für die Ablehnung an. Der Benutzer kann diesen Grund einsehen und den Eintrag entsprechend korrigieren.
        </p>
        <textarea
          autoFocus
          value={grund}
          onChange={e => setGrund(e.target.value)}
          placeholder="z. B. Gewicht fehlt, Wildart unklar …"
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={!grund.trim() || loading}
            className="rounded-xl px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {loading ? 'Wird abgelehnt…' : 'Ablehnen'}
          </button>
        </div>
      </div>
    </div>
  );
};

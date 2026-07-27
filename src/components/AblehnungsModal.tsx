import { useRef, useState } from 'react';
import { DialogShell } from '@components/DialogShell';

interface AblehnungsModalProps {
  eintragId: string;
  onConfirm: (id: string, grund: string) => Promise<void>;
  onClose: () => void;
}

export const AblehnungsModal: React.FC<AblehnungsModalProps> = ({ eintragId, onConfirm, onClose }) => {
  const [grund, setGrund] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <DialogShell
      title="Eintrag ablehnen"
      description="Gib einen Grund an. Der Benutzer sieht ihn und kann den Eintrag korrigieren."
      onClose={onClose}
      closeDisabled={loading}
      initialFocusRef={textareaRef}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={loading} className="min-h-11 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2">Abbrechen</button>
          <button type="button" onClick={() => void handleConfirm()} disabled={!grund.trim() || loading} className="min-h-11 cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Wird abgelehnt…' : 'Ablehnen'}
          </button>
        </div>
      }
    >
        <textarea
          ref={textareaRef}
          value={grund}
          onChange={e => setGrund(e.target.value)}
          placeholder="z. B. Gewicht fehlt, Wildart unklar …"
          rows={4}
          aria-label="Ablehnungsgrund"
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-600/30"
        />
    </DialogShell>
  );
};

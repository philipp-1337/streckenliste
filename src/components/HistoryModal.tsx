import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, PlusCircle, Edit2, Trash2 } from 'lucide-react';
import type { EintragHistory } from '@types';
import { DialogShell } from '@components/DialogShell';

interface HistoryModalProps {
  eintragId: string;
  wildart: string;
  datum: string;
  onClose: () => void;
  getHistory: (id: string) => Promise<EintragHistory[]>;
}

const ACTION_CONFIG: Record<EintragHistory['action'], { label: string; color: string; Icon: React.ElementType }> = {
  created:          { label: 'Erstellt',               color: 'text-blue-600',  Icon: PlusCircle   },
  updated:          { label: 'Bearbeitet',              color: 'text-amber-600', Icon: Edit2        },
  approved:         { label: 'Freigegeben',             color: 'text-green-600', Icon: CheckCircle2 },
  rejected:         { label: 'Abgelehnt',               color: 'text-rose-600',  Icon: XCircle      },
  reset_to_pending: { label: 'Zurück auf Ausstehend',   color: 'text-gray-500',  Icon: RotateCcw    },
  deleted:          { label: 'Gelöscht',                color: 'text-rose-700',  Icon: Trash2       },
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ eintragId, wildart, datum, onClose, getHistory }) => {
  const [entries, setEntries] = useState<EintragHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getHistory(eintragId)
      .then(h => { if (active) setEntries(h) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) });
    return () => { active = false };
  }, [eintragId, getHistory]);

  const formatDate = (ts: EintragHistory['timestamp']) => {
    if (!ts) return '–';
    const d = ts.toDate();
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DialogShell
      title={`Verlauf – ${wildart}`}
      description={new Date(datum).toLocaleDateString('de-DE')}
      onClose={onClose}
    >
        <div>
          {loading && (
            <p role="status" className="py-8 text-center text-sm text-gray-500">Verlauf wird geladen…</p>
          )}
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Der Verlauf konnte nicht geladen werden. Schließe den Dialog und versuche es erneut.
            </div>
          )}
          {!loading && entries.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">Kein Verlauf vorhanden.</p>
          )}
          {!loading && entries.length > 0 && (
            <ol className="relative border-l border-gray-200 ml-2 space-y-5">
              {entries.map(entry => {
                const cfg = ACTION_CONFIG[entry.action];
                const Icon = cfg.Icon;
                return (
                  <li key={entry.id} className="ml-5">
                    <span className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-white ring-2 ring-gray-200 ${cfg.color}`}>
                      <Icon size={12} />
                    </span>
                    <div className="text-sm">
                      <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-gray-500"> · {formatDate(entry.timestamp)}</span>
                      <br />
                      <span className="text-gray-600">{entry.changedByName}</span>
                      {entry.reason && (
                        <p className="mt-1 text-xs bg-rose-50 text-rose-700 rounded px-2 py-1 border border-rose-100">
                          Grund: {entry.reason}
                        </p>
                      )}
                      {entry.changedFields && entry.changedFields.length > 0 && (
                        <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                          <p className="text-xs font-medium text-amber-900">Geänderte Felder</p>
                          <ul className="mt-1 space-y-1 text-xs text-amber-950">
                            {entry.changedFields.map((change) => (
                              <li key={`${entry.id}-${change.field}`}>
                                <span className="font-medium">{change.label}:</span> {change.before} → {change.after}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
    </DialogShell>
  );
};

import { useEffect, useState } from 'react';
import { X, Clock, CheckCircle2, XCircle, RotateCcw, PlusCircle, Edit2 } from 'lucide-react';
import type { EintragHistory } from '@types';

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
};

export const HistoryModal: React.FC<HistoryModalProps> = ({ eintragId, wildart, datum, onClose, getHistory }) => {
  const [entries, setEntries] = useState<EintragHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory(eintragId).then(h => {
      setEntries(h);
      setLoading(false);
    });
  }, [eintragId, getHistory]);

  const formatDate = (ts: EintragHistory['timestamp']) => {
    if (!ts) return '–';
    const d = ts.toDate();
    return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-500" />
            <h3 className="text-base font-semibold text-gray-900">
              Verlauf – {wildart} ({new Date(datum).toLocaleDateString('de-DE')})
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">
          {loading && (
            <p className="text-sm text-gray-500 text-center py-8">Wird geladen…</p>
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
      </div>
    </div>
  );
};

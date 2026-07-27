import { useState } from 'react';
import { AlertCircle, CheckCircle2, Play, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fixKategorienFuerJagdbezirk, previewKategorienKorrektur } from '@utils/fixKategorien';
import useAuth from '@hooks/useAuth';
import { DialogShell } from '@components/DialogShell';
import { ConfirmDialog } from '@components/ConfirmDialog';

interface KategorienFixDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KategorienFixDialog: React.FC<KategorienFixDialogProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vorschau, setVorschau] = useState<Awaited<ReturnType<typeof previewKategorienKorrektur>> | null>(null);
  const [ergebnis, setErgebnis] = useState<Awaited<ReturnType<typeof fixKategorienFuerJagdbezirk>> | null>(null);
  const [confirmFix, setConfirmFix] = useState(false);

  const handleVorschau = async () => {
    if (!currentUser?.jagdbezirkId) {
      toast.error('Kein Jagdbezirk gefunden');
      return;
    }

    setLoading(true);
    try {
      const result = await previewKategorienKorrektur(currentUser.jagdbezirkId);
      setVorschau(result);
      toast.info(`${result.zuKorrigieren} Einträge müssen korrigiert werden`);
    } catch (error) {
      toast.error('Fehler beim Laden der Vorschau');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFix = async () => {
    if (!currentUser?.jagdbezirkId) {
      toast.error('Kein Jagdbezirk gefunden');
      return;
    }

    setLoading(true);
    try {
      const result = await fixKategorienFuerJagdbezirk(currentUser.jagdbezirkId);
      setErgebnis(result);
      toast.success(`${result.korrigiert} Einträge erfolgreich korrigiert!`);
      if (result.fehler > 0) {
        toast.warning(`${result.fehler} Einträge konnten nicht korrigiert werden`);
      }
      // Seite neu laden nach erfolgreicher Korrektur
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error('Fehler beim Korrigieren der Kategorien');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <DialogShell
      title="Kategorien-Korrektur"
      description="Prüft ältere CSV-Einträge und korrigiert bekannte Kategorien automatisch."
      onClose={onClose}
      closeDisabled={loading}
      size="lg"
    >
        <div>
          <div className="space-y-4 mb-6">
            <p className="text-gray-700">
              Dieses Tool korrigiert fehlerhafte Kategorien aus dem CSV-Import. 
              Einträge mit "weibliches Wild", "männliches Wild" oder "Jungwild" werden
              basierend auf Wildart, Altersklasse und Geschlecht automatisch korrigiert.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleVorschau}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Vorschau anzeigen
              </button>

              <button
                onClick={() => setConfirmFix(true)}
                disabled={loading || !vorschau}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                Kategorien korrigieren
              </button>
            </div>
          </div>

          {/* Vorschau-Tabelle */}
          {vorschau && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">
                  Vorschau: {vorschau.zuKorrigieren} von {vorschau.gesamt} Einträgen benötigen Korrektur
                </h3>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wildart</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alt</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Neu</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">AK</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Geschlecht</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vorschau.vorschau.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm">{item.datum}</td>
                        <td className="px-3 py-2 text-sm">{item.wildart}</td>
                        <td className="px-3 py-2 text-sm text-red-600">{item.altKategorie}</td>
                        <td className="px-3 py-2 text-sm text-green-600">
                          {item.neueKategorie || <span className="text-red-500">Keine Zuordnung!</span>}
                        </td>
                        <td className="px-3 py-2 text-sm">{item.altersklasse}</td>
                        <td className="px-3 py-2 text-sm">{item.geschlecht}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ergebnis */}
          {ergebnis && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-green-800">Korrektur abgeschlossen</h3>
              </div>

              <div className="space-y-2 text-sm">
                <p>✅ {ergebnis.korrigiert} Einträge erfolgreich korrigiert</p>
                {ergebnis.fehler > 0 && (
                  <p className="text-yellow-700">⚠️ {ergebnis.fehler} Einträge konnten nicht korrigiert werden</p>
                )}
                <p className="text-gray-600">📊 Gesamt: {ergebnis.gesamt} Einträge geprüft</p>
              </div>

              {ergebnis.details.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Details anzeigen ({ergebnis.details.length} Korrekturen)
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left">Wildart</th>
                          <th className="px-2 py-1 text-left">Alt</th>
                          <th className="px-2 py-1 text-left">Neu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ergebnis.details.map((detail, idx) => (
                          <tr key={detail.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-2 py-1">{detail.wildart}</td>
                            <td className="px-2 py-1 text-red-600">{detail.alt}</td>
                            <td className="px-2 py-1 text-green-600">{detail.neu}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
    </DialogShell>
    <ConfirmDialog
      open={confirmFix}
      title="Kategorien korrigieren?"
      description="Die in der Vorschau aufgeführten Einträge werden dauerhaft angepasst."
      confirmLabel="Korrigieren"
      tone="primary"
      onCancel={() => setConfirmFix(false)}
      onConfirm={async () => {
        await handleFix()
        setConfirmFix(false)
      }}
    />
    </>
  );
};

export default KategorienFixDialog;

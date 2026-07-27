import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { importCSV } from '@utils/csvImport';
import type { Eintrag } from '@types';
import { DialogShell } from '@components/DialogShell';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (eintraege: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]) => Promise<void>;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]>([]);
  const [error, setError] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');
    setSuccess(false);

    try {
      const text = await selectedFile.text();
      const eintraege = importCSV(text);
      
      if (eintraege.length === 0) {
        setError('Keine gültigen Einträge in der CSV-Datei gefunden.');
        setPreview([]);
        return;
      }

      setPreview(eintraege);
    } catch (err) {
      setError(`Fehler beim Lesen der Datei: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    setError('');

    try {
      await onImport(preview);
      setSuccess(true);
    } catch (err) {
      setError(`Fehler beim Importieren: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <DialogShell
      title="CSV-Import"
      description="Prüfe die Vorschau, bevor die Einträge in den Jagdbezirk übernommen werden."
      onClose={handleClose}
      closeDisabled={importing}
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button onClick={handleClose} className="min-h-11 cursor-pointer rounded-xl bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2" disabled={importing}>
            {success ? 'Schließen' : 'Abbrechen'}
          </button>
          {!success && (
            <button onClick={() => void handleImport()} disabled={preview.length === 0 || importing} className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300">
              {importing ? <><div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" />Importiere…</> : <><Upload className="size-4" />{preview.length} Einträge importieren</>}
            </button>
          )}
        </div>
      }
    >
        <div>
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV-Datei auswählen
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5" />
                Datei auswählen
              </button>
              {file && (
                <div className="flex items-center gap-2 text-gray-700">
                  <FileText className="w-5 h-5" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">Import erfolgreich! {preview.length} Einträge importiert.</p>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Vorschau ({preview.length} Einträge)
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wildart</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fachbegriff</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jäger</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gewicht</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Einnahmen</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.map((eintrag, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{eintrag.datum}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{eintrag.wildart}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{eintrag.fachbegriff}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{eintrag.jaeger}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{eintrag.gewicht ? `${eintrag.gewicht} kg` : '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{eintrag.einnahmen ? `${eintrag.einnahmen} €` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Info Text */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Hinweis:</strong> Die Einträge werden mit Ihrem Benutzerkonto verknüpft und in Ihren Jagdbezirk importiert.
                </p>
              </div>
            </div>
          )}
        </div>
    </DialogShell>
  );
};

export default ImportDialog;

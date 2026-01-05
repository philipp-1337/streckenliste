import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { importCSV } from '@utils/csvImport';
import type { Eintrag } from '@types';

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
      setTimeout(() => {
        handleClose();
      }, 2000);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">CSV Import</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
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
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
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
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Hinweis:</strong> Die Einträge werden mit Ihrem Benutzerkonto verknüpft und in Ihren Jagdbezirk importiert.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={importing}
          >
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            disabled={preview.length === 0 || importing || success}
            className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importiere...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {preview.length} Einträge importieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

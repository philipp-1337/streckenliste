import { useState, type FormEvent } from 'react';
import type { Eintrag } from '@types';
import { wildarten } from '@data/wildarten';

interface EintragFormProps {
  editingEntry: Eintrag | null;
  onSubmit: (data: Omit<Eintrag, 'id'>) => void;
  onCancel: () => void;
}

export const EintragForm: React.FC<EintragFormProps> = ({
  editingEntry,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Omit<Eintrag, 'id'> & Partial<Pick<Eintrag, 'userId' | 'jagdbezirkId'>>>(() => {
    if (editingEntry) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, userId, jagdbezirkId, ...data } = editingEntry; // Destructure userId and jagdbezirkId
      return data;
    }
    return {
      datum: '',
      wildart: '',
      kategorie: '',
      altersklasse: '',
      geschlecht: '',
      fachbegriff: '',
      gewicht: '',
      bemerkung: '',
      jaeger: '',
      ort: '',
      einnahmen: '',
      notizen: ''
    };
  });

  const getKategorienFuerWildart = (wildart: string) => {
    return wildarten[wildart] || [];
  };

  const handleWildartChange = (wildart: string) => {
    setFormData({
      ...formData,
      wildart,
      altersklasse: '',
      geschlecht: '',
      fachbegriff: '',
      kategorie: ''
    });
  };

  const handleKategorieChange = (kategorie: string) => {
    const wildartData = getKategorienFuerWildart(formData.wildart);
    const selectedKategorie = wildartData.find(k => k.kategorie === kategorie);

    setFormData({
      ...formData,
      kategorie,
      altersklasse: selectedKategorie?.altersklasse || '',
      geschlecht: selectedKategorie?.geschlecht || '',
      fachbegriff: selectedKategorie?.fachbegriff || ''
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(formData as Omit<Eintrag, 'id'>); // Cast to Omit<Eintrag, 'id'>
  };

  return (
    <div className="bg-white p-6 rounded-lg mb-6 shadow">
      <h3 className="text-xl font-bold mb-4">
        {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Datum *</label>
            <input
              type="date"
              required
              value={formData.datum}
              onChange={(e) => setFormData({...formData, datum: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wildart *</label>
            <select
              required
              value={formData.wildart}
              onChange={(e) => handleWildartChange(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Bitte wählen...</option>
              {Object.keys(wildarten).map(wildart => (
                <option key={wildart} value={wildart}>{wildart}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kategorie/Typ *</label>
            <select
              required
              value={formData.kategorie}
              onChange={(e) => handleKategorieChange(e.target.value)}
              disabled={!formData.wildart}
              className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
            >
              <option value="">Bitte wählen...</option>
              {getKategorienFuerWildart(formData.wildart).map(kategorie => (
                <option key={kategorie.kategorie} value={kategorie.kategorie}>
                  {kategorie.kategorie}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Automatisch ausgefüllte Felder */}
        {formData.kategorie && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Automatisch ermittelt:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <p><strong>Fachbegriff:</strong> {formData.fachbegriff}</p>
              <p><strong>Altersklasse:</strong> {formData.altersklasse}</p>
              <p><strong>Geschlecht:</strong> {formData.geschlecht === 'm' ? '♂ männlich' : '♀ weiblich'}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.gewicht}
              onChange={(e) => setFormData({...formData, gewicht: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Einnahmen (€)</label>
            <input
              type="number"
              step="0.01"
              value={formData.einnahmen}
              onChange={(e) => setFormData({...formData, einnahmen: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jäger</label>
            <input
              type="text"
              value={formData.jaeger}
              onChange={(e) => setFormData({...formData, jaeger: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ort/Revier</label>
            <input
              type="text"
              value={formData.ort}
              onChange={(e) => setFormData({...formData, ort: e.target.value})}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bemerkung</label>
          <input
            type="text"
            value={formData.bemerkung}
            onChange={(e) => setFormData({...formData, bemerkung: e.target.value})}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="z.B. Erleger, Unfallwild, Drückjagd, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notizen</label>
          <textarea
            value={formData.notizen}
            onChange={(e) => setFormData({...formData, notizen: e.target.value})}
            className="w-full border rounded-lg px-3 py-2 h-20"
            placeholder="Weitere Details zum Abschuss..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            {editingEntry ? 'Aktualisieren' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
};

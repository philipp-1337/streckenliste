import { useState, useEffect, type FormEvent } from 'react';
import { Plus, Edit, Trash2, Download, Filter, BarChart3 } from 'lucide-react';

interface Eintrag {
  id: number;
  datum: string;
  wildart: string;
  kategorie: string;
  altersklasse: string;
  geschlecht: string;
  fachbegriff: string;
  gewicht: string;
  bemerkung: string;
  jaeger: string;
  ort: string;
  einnahmen: string;
  notizen: string;
}

interface WildartStats {
  anzahl: number;
  gewicht: number;
  einnahmen: number;
  altersklassen: { [key: string]: number };
}

interface AllStats {
  [key: string]: WildartStats;
}

interface WildartInfo {
  kategorie: string;
  altersklasse: string;
  geschlecht: string;
  fachbegriff: string;
}

interface Wildarten {
  [key: string]: WildartInfo[];
}

const JagdStreckenliste = () => {
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [filter, setFilter] = useState({ wildart: '', jaeger: '', jahr: '', kategorie: '' });

  // Wildarten mit ihren spezifischen Kategorien und Fachbegriffen
  const wildarten: Wildarten = {
    'Rotwild': [
      // AK 0 (unter 1 Jahr)
      { kategorie: 'Kalb männlich', altersklasse: 'AK 0', geschlecht: 'm', fachbegriff: 'Hirschkalb' },
      { kategorie: 'Kalb weiblich', altersklasse: 'AK 0', geschlecht: 'w', fachbegriff: 'Hirschkalb' },
      // AK 1 (1 Jahr)
      { kategorie: 'Schmaltier', altersklasse: 'AK 1', geschlecht: 'w', fachbegriff: 'Schmaltier' },
      { kategorie: 'Schmalspießer', altersklasse: 'AK 1', geschlecht: 'm', fachbegriff: 'Schmalspießer' },
      // AK 2+ (ab 2 Jahre)
      { kategorie: 'Alttier', altersklasse: 'AK 2', geschlecht: 'w', fachbegriff: 'Alttier' },
      { kategorie: 'Junger Hirsch (2-4 Jahre)', altersklasse: 'AK 2', geschlecht: 'm', fachbegriff: 'Junger Hirsch' },
      { kategorie: 'Mittelalter Hirsch (5-9 Jahre)', altersklasse: 'AK 3', geschlecht: 'm', fachbegriff: 'Mittelalter Hirsch' },
      { kategorie: 'Alter Hirsch (ab 10 Jahre)', altersklasse: 'AK 4', geschlecht: 'm', fachbegriff: 'Alter Hirsch' }
    ],
    'Damwild': [
      { kategorie: 'Kalb männlich', altersklasse: 'AK 0', geschlecht: 'm', fachbegriff: 'Damhirschkalb' },
      { kategorie: 'Kalb weiblich', altersklasse: 'AK 0', geschlecht: 'w', fachbegriff: 'Damhirschkalb' },
      { kategorie: 'Schmaltier', altersklasse: 'AK 1', geschlecht: 'w', fachbegriff: 'Schmaltier' },
      { kategorie: 'Schmalspießer', altersklasse: 'AK 1', geschlecht: 'm', fachbegriff: 'Schmalspießer' },
      { kategorie: 'Alttier', altersklasse: 'AK 2', geschlecht: 'w', fachbegriff: 'Alttier' },
      { kategorie: 'Junger Hirsch (2-4 Jahre)', altersklasse: 'AK 2', geschlecht: 'm', fachbegriff: 'Junger Damhirsch' },
      { kategorie: 'Mittelalter Hirsch (3-7 Jahre)', altersklasse: 'AK 3', geschlecht: 'm', fachbegriff: 'Mittelalter Damhirsch' },
      { kategorie: 'Alter Hirsch (ab 8 Jahre)', altersklasse: 'AK 4', geschlecht: 'm', fachbegriff: 'Alter Damhirsch' }
    ],
    'Rehwild': [
      { kategorie: 'Kitz männlich', altersklasse: 'AK 0', geschlecht: 'm', fachbegriff: 'Bockkitz' },
      { kategorie: 'Kitz weiblich', altersklasse: 'AK 0', geschlecht: 'w', fachbegriff: 'Rickenkitz' },
      { kategorie: 'Schmalreh', altersklasse: 'AK 1', geschlecht: 'w', fachbegriff: 'Schmalreh' },
      { kategorie: 'Jährling', altersklasse: 'AK 1', geschlecht: 'm', fachbegriff: 'Jährling' },
      { kategorie: 'Ricke', altersklasse: 'AK 2', geschlecht: 'w', fachbegriff: 'Ricke' },
      { kategorie: 'Rehbock (ab 2 Jahre)', altersklasse: 'AK 2', geschlecht: 'm', fachbegriff: 'Rehbock' }
    ],
    'Schwarzwild': [
      { kategorie: 'Frischling männlich', altersklasse: 'AK 0', geschlecht: 'm', fachbegriff: 'Frischling' },
      { kategorie: 'Frischling weiblich', altersklasse: 'AK 0', geschlecht: 'w', fachbegriff: 'Frischling' },
      { kategorie: 'Überläuferbache', altersklasse: 'AK 1', geschlecht: 'w', fachbegriff: 'Überläuferbache' },
      { kategorie: 'Überläuferkeiler', altersklasse: 'AK 1', geschlecht: 'm', fachbegriff: 'Überläuferkeiler' },
      { kategorie: 'Bache', altersklasse: 'AK 2', geschlecht: 'w', fachbegriff: 'Bache' },
      { kategorie: 'Keiler (ab 2 Jahre)', altersklasse: 'AK 2', geschlecht: 'm', fachbegriff: 'Keiler' }
    ]
  };

  const [formData, setFormData] = useState({
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
  });

  // Initialisierung mit Beispieldaten
  useEffect(() => {
    const beispielDaten: Eintrag[] = [
      {
        id: 1,
        datum: '2024-10-15',
        wildart: 'Rehwild',
        kategorie: 'Rehbock (ab 2 Jahre)',
        altersklasse: 'AK 2',
        geschlecht: 'm',
        fachbegriff: 'Rehbock',
        gewicht: '22',
        bemerkung: 'Morgenjagd',
        jaeger: 'Hans Müller',
        ort: 'Revier Ost',
        einnahmen: '80',
        notizen: 'Guter 6er Bock'
      },
      {
        id: 2,
        datum: '2024-11-02',
        wildart: 'Schwarzwild',
        kategorie: 'Bache',
        altersklasse: 'AK 2',
        geschlecht: 'w',
        fachbegriff: 'Bache',
        gewicht: '85',
        bemerkung: 'Drückjagd',
        jaeger: 'Maria Schmidt',
        ort: 'Revier West',
        einnahmen: '120',
        notizen: 'Führende Bache'
      },
      {
        id: 3,
        datum: '2024-09-20',
        wildart: 'Rehwild',
        kategorie: 'Kitz weiblich',
        altersklasse: 'AK 0',
        geschlecht: 'w',
        fachbegriff: 'Rickenkitz',
        gewicht: '12',
        bemerkung: 'Einzelkitz',
        jaeger: 'Klaus Weber',
        ort: 'Revier Süd',
        einnahmen: '30',
        notizen: 'Spätes Kitz'
      }
    ];
    setEintraege(beispielDaten);
  }, []);

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
      kategorie: '' // Reset kategorie when wildart changes
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
    
    if (editingId) {
      setEintraege(eintraege.map(eintrag => 
        eintrag.id === editingId ? { ...eintrag, ...formData, id: editingId } : eintrag
      ));
      setEditingId(null);
    } else {
      const neuerEintrag: Eintrag = {
        ...formData,
        id: Date.now()
      };
      setEintraege([...eintraege, neuerEintrag]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
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
    });
    setShowForm(false);
  };

  const handleEdit = (eintrag: Eintrag) => {
    setFormData(eintrag);
    setEditingId(eintrag.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Eintrag wirklich löschen?')) {
      setEintraege(eintraege.filter(e => e.id !== id));
    }
  };

  const getFilteredEintraege = () => {
    return eintraege.filter(eintrag => {
      const matchWildart = !filter.wildart || eintrag.wildart === filter.wildart;
      const matchJaeger = !filter.jaeger || eintrag.jaeger.toLowerCase().includes(filter.jaeger.toLowerCase());
      const matchJahr = !filter.jahr || eintrag.datum.startsWith(filter.jahr);
      const matchKategorie = !filter.kategorie || eintrag.kategorie.toLowerCase().includes(filter.kategorie.toLowerCase());
      return matchWildart && matchJaeger && matchJahr && matchKategorie;
    });
  };

  const getStatistiken = () => {
    const filtered = getFilteredEintraege();
    const stats: AllStats = {};
    
    filtered.forEach(eintrag => {
      if (!stats[eintrag.wildart]) {
        stats[eintrag.wildart] = { anzahl: 0, gewicht: 0, einnahmen: 0, altersklassen: {} };
      }
      stats[eintrag.wildart].anzahl += 1;
      stats[eintrag.wildart].gewicht += parseFloat(eintrag.gewicht || '0');
      stats[eintrag.wildart].einnahmen += parseFloat(eintrag.einnahmen || '0');
      
      // Altersklassen-Statistik
      const ak = eintrag.altersklasse;
      if (!stats[eintrag.wildart].altersklassen[ak]) {
        stats[eintrag.wildart].altersklassen[ak] = 0;
      }
      stats[eintrag.wildart].altersklassen[ak] += 1;
    });
    
    return stats;
  };

  const exportCSV = () => {
    const filtered = getFilteredEintraege();
    const headers = ['Nr.', 'Datum', 'Wildart', 'Kategorie', 'Fachbegriff', 'Altersklasse', 'Geschlecht', 'Gewicht (kg)', 'Bemerkung', 'Name Jäger', 'Ort', 'Einnahmen', 'Notizen'];
    
    const csvContent = [
      headers.join(','),
      ...filtered.map((eintrag, index) => [
        index + 1,
        eintrag.datum,
        `"${eintrag.wildart}"`, 
        `"${eintrag.kategorie}"`, 
        `"${eintrag.fachbegriff}"`, 
        eintrag.altersklasse,
        eintrag.geschlecht,
        eintrag.gewicht,
        `"${eintrag.bemerkung}"`, 
        `"${eintrag.jaeger}"`, 
        `"${eintrag.ort}"`, 
        eintrag.einnahmen,
        `"${eintrag.notizen}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `streckenliste_${new Date().getFullYear()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="bg-green-800 text-white p-6 rounded-lg mb-6">
          <h1 className="text-3xl font-bold">🦌 Jagd-Streckenliste</h1>
          <p className="mt-2">Digitale Erfassung der Jagdstrecke mit korrekten Fachbegriffen</p>
        </header>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Neuer Eintrag
          </button>
          <button
            onClick={() => setShowStats(!showStats)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <BarChart3 size={20} />
            Statistiken
          </button>
          <button
            onClick={exportCSV}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={20} />
            CSV Export
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg mb-6 shadow">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={20} />
            <h3 className="font-semibold">Filter</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={filter.wildart}
              onChange={(e) => setFilter({...filter, wildart: e.target.value})}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">Alle Wildarten</option>
              {Object.keys(wildarten).map(wildart => (
                <option key={wildart} value={wildart}>{wildart}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Kategorie suchen..."
              value={filter.kategorie}
              onChange={(e) => setFilter({...filter, kategorie: e.target.value})}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="text"
              placeholder="Jäger suchen..."
              value={filter.jaeger}
              onChange={(e) => setFilter({...filter, jaeger: e.target.value})}
              className="border rounded-lg px-3 py-2"
            />
            <select
              value={filter.jahr}
              onChange={(e) => setFilter({...filter, jahr: e.target.value})}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">Alle Jahre</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* Statistiken */}
        {showStats && (
          <div className="bg-white p-6 rounded-lg mb-6 shadow">
            <h3 className="text-xl font-bold mb-4">📊 Statistiken</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(getStatistiken()).map(([wildart, stats]) => (
                <div key={wildart} className="bg-green-100 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">{wildart}</h4>
                  <p className="text-sm mb-2">Gesamt: <strong>{stats.anzahl}</strong> Stück</p>
                  <p className="text-sm mb-2">Gewicht: <strong>{stats.gewicht.toFixed(1)}</strong> kg</p>
                  <p className="text-sm mb-3">Einnahmen: <strong>{stats.einnahmen.toFixed(2)}</strong> €</p>
                  
                  <div className="text-xs space-y-1 border-t pt-2">
                    <p className="font-medium">Nach Altersklassen:</p>
                    {Object.entries(stats.altersklassen).map(([ak, anzahl]) => (
                      <p key={ak} className="ml-2">{ak}: {anzahl as number} Stück</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eingabe-Formular */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg mb-6 shadow">
            <h3 className="text-xl font-bold mb-4">
              {editingId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
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
                  {editingId ? 'Aktualisieren' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabelle */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-green-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Nr.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Datum</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Wildart</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Kategorie</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Fachbegriff</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">AK</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">♂/♀</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">kg</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Jäger</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Bemerkung</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getFilteredEintraege().map((eintrag, index) => (
                  <tr key={eintrag.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm">{new Date(eintrag.datum).toLocaleDateString('de-DE')}</td>
                    <td className="px-4 py-3 text-sm font-medium">{eintrag.wildart}</td>
                    <td className="px-4 py-3 text-sm">{eintrag.kategorie}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-700">{eintrag.fachbegriff}</td>
                    <td className="px-4 py-3 text-center text-sm">{eintrag.altersklasse}</td>
                    <td className="px-4 py-3 text-center text-sm">{eintrag.geschlecht === 'm' ? '♂' : '♀'}</td>
                    <td className="px-4 py-3 text-center text-sm">{eintrag.gewicht || '-'}</td>
                    <td className="px-4 py-3 text-sm">{eintrag.jaeger}</td>
                    <td className="px-4 py-3 text-sm">{eintrag.bemerkung}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(eintrag)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(eintrag.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {getFilteredEintraege().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Keine Einträge gefunden. Erstellen Sie den ersten Eintrag!
            </div>
          )}
        </div>

        {/* Legende */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3">📖 Fachbegriffe und Altersklassen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {Object.entries(wildarten).map(([wildart, kategorien]) => (
              <div key={wildart} className="bg-gray-50 p-3 rounded">
                <h4 className="font-medium text-green-800 mb-2">{wildart}</h4>
                <div className="space-y-1">
                  {kategorien.map((kat, idx) => (
                    <div key={idx} className="text-xs">
                      <span className="font-medium">{kat.fachbegriff}</span>
                      <span className="text-gray-600 ml-1">({kat.altersklasse})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JagdStreckenliste;

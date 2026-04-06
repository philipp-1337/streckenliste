import { useEffect, useState } from 'react';
import Spinner from '@components/Spinner';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mars, Venus } from 'lucide-react';
import type { Eintrag } from '@types';
import { wildarten } from '@data/wildarten';
import { eintragFormSchema } from '@utils/validation';
import useAuth from '@hooks/useAuth';

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
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isFallwild, setIsFallwild] = useState(false);
  const [sonstigeAnzahl, setSonstigeAnzahl] = useState(1);

  // Initialize form with React Hook Form and Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors, isValid }
  } = useForm<Omit<Eintrag, 'id'>>({
    resolver: zodResolver(eintragFormSchema) as Resolver<Omit<Eintrag, 'id'>>,
    mode: 'onChange', // Validate on change for better UX
    defaultValues: editingEntry
      ? {
          datum: editingEntry.datum,
          wildart: editingEntry.wildart,
          kategorie: editingEntry.kategorie,
          altersklasse: editingEntry.altersklasse,
          geschlecht: editingEntry.geschlecht,
          fachbegriff: editingEntry.fachbegriff,
          gewicht: editingEntry.gewicht,
          bemerkung: editingEntry.bemerkung,
          wildursprungsschein: editingEntry.wildursprungsschein,
          jaeger: editingEntry.jaeger,
          ort: editingEntry.ort,
          einnahmen: editingEntry.einnahmen,
          notizen: editingEntry.notizen,
          jagdbezirkId: editingEntry.jagdbezirkId,
          userId: editingEntry.userId
        }
      : {
          datum: '',
          wildart: '',
          kategorie: '',
          altersklasse: '',
          geschlecht: '',
          fachbegriff: '',
          gewicht: '',
          bemerkung: '',
          wildursprungsschein: '',
          jaeger: currentUser?.role === 'user' ? (currentUser?.displayName ?? '') : '',
          ort: '',
          einnahmen: '',
          notizen: '',
          jagdbezirkId: '',
          userId: ''
        }
  });

  // Watch form fields for dynamic updates
  const watchedWildart = watch('wildart');
  const watchedKategorie = watch('kategorie');
  const watchedFachbegriff = watch('fachbegriff');
  const watchedAltersklasse = watch('altersklasse');
  const watchedGeschlecht = watch('geschlecht');

  // Sync Fallwild/Anzahl state when editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      const bem = (editingEntry.bemerkung || '').toLowerCase();
      setIsFallwild(bem.includes('fallwild'));
      const countMatch = editingEntry.bemerkung?.match(/^(\d+)\s*x/i);
      setSonstigeAnzahl(countMatch ? parseInt(countMatch[1], 10) : 1);
    } else {
      setIsFallwild(false);
      setSonstigeAnzahl(1);
    }
  }, [editingEntry]);

  // Reset form when editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      let kategorieValue = editingEntry.kategorie;
      // Wenn Sonstige, dann kombiniere Kategorie und Fachbegriff für das neue value-Format
      if (editingEntry.wildart === 'Sonstige' && editingEntry.kategorie && editingEntry.fachbegriff) {
        kategorieValue = `${editingEntry.kategorie}|${editingEntry.fachbegriff}`;
      }
      reset({
        datum: editingEntry.datum ?? '',
        wildart: editingEntry.wildart ?? '',
        kategorie: kategorieValue ?? '',
        altersklasse: editingEntry.altersklasse ?? '',
        geschlecht: editingEntry.geschlecht ?? '',
        fachbegriff: editingEntry.fachbegriff ?? '',
        gewicht: editingEntry.gewicht != null ? String(editingEntry.gewicht) : '',
        bemerkung: editingEntry.bemerkung ?? '',
        wildursprungsschein: editingEntry.wildursprungsschein ?? '',
        jaeger: editingEntry.jaeger ?? '',
        ort: editingEntry.ort ?? '',
        einnahmen: editingEntry.einnahmen != null ? String(editingEntry.einnahmen) : '',
        notizen: editingEntry.notizen ?? '',
        jagdbezirkId: editingEntry.jagdbezirkId ?? '',
        userId: editingEntry.userId ?? ''
      });
      trigger();
    }
  }, [editingEntry, reset, trigger]);

  const getKategorienFuerWildart = (wildart: string) => {
    return wildarten[wildart] || [];
  };

  const handleWildartChange = (wildart: string) => {
    setValue('wildart', wildart, { shouldValidate: true });
    setValue('altersklasse', '', { shouldValidate: true });
    setValue('geschlecht', '', { shouldValidate: true });
    setValue('fachbegriff', '', { shouldValidate: true });
    setValue('kategorie', '', { shouldValidate: true });
    setValue('bemerkung', '', { shouldValidate: true });
    setIsFallwild(false);
    setSonstigeAnzahl(1);
    trigger();
  };

  const handleFallwildChange = (checked: boolean) => {
    setIsFallwild(checked);
    setValue('bemerkung', checked ? 'sonstiges Fallwild' : '', { shouldValidate: true });
  };

  const handleSonstigeAnzahlChange = (anzahl: number) => {
    const safeAnzahl = Math.max(1, anzahl);
    setSonstigeAnzahl(safeAnzahl);
    if (watchedFachbegriff) {
      setValue('bemerkung', safeAnzahl > 1 ? `${safeAnzahl}x ${watchedFachbegriff}` : watchedFachbegriff, { shouldValidate: true });
    }
  };

  const handleKategorieChange = (kategorie: string) => {
    const isSonstige = watchedWildart === 'Sonstige';
    if (isSonstige) {
      // value ist jetzt "Kategorie|Fachbegriff"
      const fachbegriff = kategorie.split('|')[1];
      setValue('kategorie', kategorie, { shouldValidate: true }); // Wert bleibt Kategorie|Fachbegriff
      setValue('altersklasse', '', { shouldValidate: true });
      setValue('geschlecht', '', { shouldValidate: true });
      setValue('fachbegriff', fachbegriff || '', { shouldValidate: true });
      setValue('bemerkung', sonstigeAnzahl > 1 ? `${sonstigeAnzahl}x ${fachbegriff}` : (fachbegriff || ''), { shouldValidate: true });
    } else {
      const wildartData = getKategorienFuerWildart(watchedWildart);
      const selectedKategorie = wildartData.find(k => k.kategorie === kategorie);
      setValue('kategorie', kategorie, { shouldValidate: true });
      setValue('altersklasse', selectedKategorie?.altersklasse || '', { shouldValidate: true });
      setValue('geschlecht', selectedKategorie?.geschlecht || '', { shouldValidate: true });
      setValue('fachbegriff', selectedKategorie?.fachbegriff || '', { shouldValidate: true });
    }
    // Trigger validation to update isValid state
    trigger();
  };

  const onSubmitForm: SubmitHandler<Omit<Eintrag, 'id'>> = async (data) => {
    setLoading(true);
    try {
      await Promise.resolve(onSubmit({
        ...data,
        jagdbezirkId: data.jagdbezirkId || '',
        userId: data.userId || '',
        fallwild: watchedWildart !== 'Sonstige' ? isFallwild : false,
        anzahl: watchedWildart === 'Sonstige' ? sonstigeAnzahl : 1,
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg mb-6 shadow">
      <h3 className="text-xl font-bold mb-4">
        {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
      </h3>
      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Datum *</label>
            <input
              type="date"
              {...register('datum')}
              className={`w-full min-w-0 max-w-full border rounded-lg px-3 py-2 h-[42px] text-base [appearance:textfield] [-webkit-appearance:none] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                errors.datum ? 'border-red-500' : 'border-gray-300'
              }`}
              style={{ boxSizing: 'border-box' }}
            />
            {errors.datum && (
              <p className="text-red-500 text-sm mt-1">{errors.datum.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Wildart *</label>
            <select
              {...register('wildart')}
              onChange={(e) => handleWildartChange(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                errors.wildart ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Bitte wählen...</option>
              {Object.keys(wildarten).map(wildart => (
                <option key={wildart} value={wildart}>{wildart}</option>
              ))}
            </select>
            {errors.wildart && (
              <p className="text-red-500 text-sm mt-1">{errors.wildart.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Kategorie/Typ {watchedWildart !== 'Sonstige' && '*'}
            </label>
            <select
              {...register('kategorie')}
              onChange={(e) => handleKategorieChange(e.target.value)}
              disabled={!watchedWildart}
              className={`w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                errors.kategorie ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Bitte wählen...</option>
              {watchedWildart === 'Sonstige' ? (
                <>
                  <optgroup label="Raubwild">
                    {getKategorienFuerWildart('Sonstige')
                      .filter(k => k.kategorie === 'Raubwild')
                      .map((kategorie, idx) => (
                        <option key={`raubwild-${idx}`} value={`Raubwild|${kategorie.fachbegriff}`}>
                          {kategorie.fachbegriff}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Invasive Arten">
                    {getKategorienFuerWildart('Sonstige')
                      .filter(k => k.kategorie === 'Invasive Arten')
                      .map((kategorie, idx) => (
                        <option key={`invasiv-${idx}`} value={`Invasive Arten|${kategorie.fachbegriff}`}>
                          {kategorie.fachbegriff}
                        </option>
                      ))}
                  </optgroup>
                </>
              ) : (
                getKategorienFuerWildart(watchedWildart).map(kategorie => (
                  <option key={kategorie.kategorie} value={kategorie.kategorie}>
                    {kategorie.kategorie} {kategorie.altersklasse && `(${kategorie.altersklasse})`}
                  </option>
                ))
              )}
            </select>
            {errors.kategorie && (
              <p className="text-red-500 text-sm mt-1">{errors.kategorie.message}</p>
            )}
          </div>
        </div>

        {/* Automatisch ausgefüllte Felder */}
        {watchedKategorie && watchedWildart !== 'Sonstige' && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-green-800">Automatisch ermittelt</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <p><strong>Fachbegriff:</strong> {watchedFachbegriff}</p>
              <p><strong>Altersklasse:</strong> {watchedAltersklasse}</p>
              <p className="flex items-center gap-1">
                <strong>Geschlecht:</strong>
                {watchedGeschlecht === 'm' ? (
                  <span className="flex items-center gap-1"><Mars size={16} /> männlich</span>
                ) : (
                  <span className="flex items-center gap-1"><Venus size={16} /> weiblich</span>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
            <input
              type="number"
              step="0.1"
              {...register('gewicht')}
              className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                errors.gewicht ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.gewicht && (
              <p className="text-red-500 text-sm mt-1">{errors.gewicht.message}</p>
            )}
          </div>
          {currentUser?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium mb-1">Einnahmen (€)</label>
              <input
                type="number"
                step="0.01"
                {...register('einnahmen')}
                className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                  errors.einnahmen ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.einnahmen && (
                <p className="text-red-500 text-sm mt-1">{errors.einnahmen.message}</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Jäger</label>
            <input
              type="text"
              {...register('jaeger')}
              className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                errors.jaeger ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.jaeger && (
              <p className="text-red-500 text-sm mt-1">{errors.jaeger.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ort/Revier</label>
            <input
              type="text"
              {...register('ort')}
              className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
                errors.ort ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.ort && (
              <p className="text-red-500 text-sm mt-1">{errors.ort.message}</p>
            )}
          </div>
        </div>

        {watchedWildart && watchedWildart !== 'Sonstige' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="fallwild"
              checked={isFallwild}
              onChange={(e) => handleFallwildChange(e.target.checked)}
              className="w-4 h-4 accent-green-700 cursor-pointer"
            />
            <label htmlFor="fallwild" className="text-sm font-medium cursor-pointer select-none">
              Fallwild
            </label>
          </div>
        )}

        {watchedWildart === 'Sonstige' && watchedFachbegriff && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Anzahl</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSonstigeAnzahlChange(sonstigeAnzahl - 1)}
                disabled={sonstigeAnzahl <= 1}
                className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >−</button>
              <span className="w-8 text-center font-semibold">{sonstigeAnzahl}</span>
              <button
                type="button"
                onClick={() => handleSonstigeAnzahlChange(sonstigeAnzahl + 1)}
                className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-medium hover:bg-gray-100 cursor-pointer"
              >+</button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Bemerkung</label>
          <input
            type="text"
            {...register('bemerkung')}
            className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
              errors.bemerkung ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. Erleger, Unfallwild, Drückjagd, etc."
          />
          {errors.bemerkung && (
            <p className="text-red-500 text-sm mt-1">{errors.bemerkung.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Wildursprungsschein (Schwarzwild)</label>
          <input
            type="text"
            {...register('wildursprungsschein')}
            className={`w-full border rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
              errors.wildursprungsschein ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="z.B. 124368"
          />
          {errors.wildursprungsschein && (
            <p className="text-red-500 text-sm mt-1">{errors.wildursprungsschein.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notizen</label>
          <textarea
            {...register('notizen')}
            className={`w-full border rounded-lg px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
              errors.notizen ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Weitere Details zum Abschuss..."
          />
          {errors.notizen && (
            <p className="text-red-500 text-sm mt-1">{errors.notizen.message}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300 cursor-pointer"
          >
            {loading ? <Spinner size={20} /> : null}
            {loading ? (editingEntry ? 'Aktualisiere...' : 'Speichere...') : (editingEntry ? 'Aktualisieren' : 'Speichern')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 hover:bg-gray-50 px-6 py-2 rounded-xl transition-colors cursor-pointer"
            disabled={loading}
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
};

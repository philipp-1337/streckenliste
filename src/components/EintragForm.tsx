import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mars, Venus } from 'lucide-react';
import type { Eintrag } from '@types';
import { wildarten } from '@data/wildarten';
import { eintragFormSchema } from '@utils/validation';

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
    resolver: zodResolver(eintragFormSchema) as any,
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
          jaeger: '',
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

  // Reset form when editingEntry changes
  useEffect(() => {
    if (editingEntry) {
      reset({
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
      });
    }
  }, [editingEntry, reset]);

  const getKategorienFuerWildart = (wildart: string) => {
    return wildarten[wildart] || [];
  };

  const handleWildartChange = (wildart: string) => {
    setValue('wildart', wildart, { shouldValidate: true });
    setValue('altersklasse', '', { shouldValidate: true });
    setValue('geschlecht', '', { shouldValidate: true });
    setValue('fachbegriff', '', { shouldValidate: true });
    setValue('kategorie', '', { shouldValidate: true });
    // Trigger validation to update isValid state
    trigger();
  };

  const handleKategorieChange = (kategorie: string) => {
    const wildartData = getKategorienFuerWildart(watchedWildart);
    const selectedKategorie = wildartData.find(k => k.kategorie === kategorie);

    // Bei "Sonstige": Kategorie bleibt (Raubwild/Invasive Arten), Tier kommt in Bemerkung
    const isSonstige = watchedWildart === 'Sonstige';
    
    if (isSonstige) {
      // Bei Sonstige: kategorie ist bereits richtig (Raubwild/Invasive Arten)
      // fachbegriff enthält das Tier, das in die Bemerkung kommt
      setValue('kategorie', kategorie, { shouldValidate: true });
      setValue('altersklasse', '', { shouldValidate: true });
      setValue('geschlecht', '', { shouldValidate: true });
      setValue('fachbegriff', selectedKategorie?.fachbegriff || '', { shouldValidate: true });
      setValue('bemerkung', selectedKategorie?.fachbegriff || '', { shouldValidate: true });
    } else {
      // Normales Schalenwild
      setValue('kategorie', kategorie, { shouldValidate: true });
      setValue('altersklasse', selectedKategorie?.altersklasse || '', { shouldValidate: true });
      setValue('geschlecht', selectedKategorie?.geschlecht || '', { shouldValidate: true });
      setValue('fachbegriff', selectedKategorie?.fachbegriff || '', { shouldValidate: true });
    }
    // Trigger validation to update isValid state
    trigger();
  };

  const onSubmitForm: SubmitHandler<Omit<Eintrag, 'id'>> = (data) => {
    // userId und jagdbezirkId werden vom Backend gesetzt, also mit leeren Strings übergeben
    onSubmit({
      ...data,
      jagdbezirkId: data.jagdbezirkId || '',
      userId: data.userId || ''
    });
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
              className={`w-full min-w-0 max-w-full border rounded-lg px-3 py-2 h-[42px] text-base [appearance:textfield] [-webkit-appearance:none] ${
                errors.datum ? 'border-red-500' : ''
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
              className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
                errors.wildart ? 'border-red-500' : ''
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
              className={`w-full border rounded-lg px-3 py-2 disabled:bg-gray-100 h-[42px] ${
                errors.kategorie ? 'border-red-500' : ''
              }`}
            >
              <option value="">Bitte wählen...</option>
              {watchedWildart === 'Sonstige' ? (
                <>
                  <optgroup label="Raubwild">
                    {getKategorienFuerWildart('Sonstige')
                      .filter(k => k.kategorie === 'Raubwild')
                      .map((kategorie, idx) => (
                        <option key={`raubwild-${idx}`} value={kategorie.kategorie}>
                          {kategorie.fachbegriff}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Invasive Arten">
                    {getKategorienFuerWildart('Sonstige')
                      .filter(k => k.kategorie === 'Invasive Arten')
                      .map((kategorie, idx) => (
                        <option key={`invasiv-${idx}`} value={kategorie.kategorie}>
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
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Automatisch ermittelt:</h4>
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
              className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
                errors.gewicht ? 'border-red-500' : ''
              }`}
            />
            {errors.gewicht && (
              <p className="text-red-500 text-sm mt-1">{errors.gewicht.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Einnahmen (€)</label>
            <input
              type="number"
              step="0.01"
              {...register('einnahmen')}
              className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
                errors.einnahmen ? 'border-red-500' : ''
              }`}
            />
            {errors.einnahmen && (
              <p className="text-red-500 text-sm mt-1">{errors.einnahmen.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Jäger</label>
            <input
              type="text"
              {...register('jaeger')}
              className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
                errors.jaeger ? 'border-red-500' : ''
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
              className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
                errors.ort ? 'border-red-500' : ''
              }`}
            />
            {errors.ort && (
              <p className="text-red-500 text-sm mt-1">{errors.ort.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Bemerkung</label>
          <input
            type="text"
            {...register('bemerkung')}
            className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
              errors.bemerkung ? 'border-red-500' : ''
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
            className={`w-full border rounded-lg px-3 py-2 h-[42px] ${
              errors.wildursprungsschein ? 'border-red-500' : ''
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
            className={`w-full border rounded-lg px-3 py-2 h-20 ${
              errors.notizen ? 'border-red-500' : ''
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
            disabled={!isValid}
            className="w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
          >
            {editingEntry ? 'Aktualisieren' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
};

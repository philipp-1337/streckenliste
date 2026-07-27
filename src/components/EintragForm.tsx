import { useEffect, useState } from 'react';
import Spinner from '@components/Spinner';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mars, Venus } from 'lucide-react';
import type { Eintrag, JaegerProfile } from '@types';
import { wildarten } from '@data/wildarten';
import { eintragFormSchema } from '@utils/validation';
import useAuth from '@hooks/useAuth';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

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
  const isUserWithoutAssignment = currentUser?.role === 'user' && (!currentUser.jaegerId || !currentUser.jaegerProfile);
  const assignedJaegerName = currentUser?.jaegerProfile?.displayName || '';
  const isAdmin = currentUser?.role === 'admin';
  const [loading, setLoading] = useState(false);
  const [isFallwild, setIsFallwild] = useState(false);
  const [sonstigeAnzahl, setSonstigeAnzahl] = useState(1);
  const [jaegerProfiles, setJaegerProfiles] = useState<JaegerProfile[]>([]);
  const [loadingJaegerProfiles, setLoadingJaegerProfiles] = useState(false);

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
          jaegerId: editingEntry.jaegerId,
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
          jaeger: currentUser?.role === 'user' ? assignedJaegerName : '',
          jaegerId: currentUser?.role === 'user' ? (currentUser?.jaegerId ?? '') : '',
          ort: '',
          einnahmen: '',
          notizen: '',
          jagdbezirkId: '',
          userId: ''
        }
  });

  // Watch form fields for dynamic updates. react-hook-form ist für den
  // React Compiler nicht optimierbar; die Komponente wird schlicht nicht
  // kompiliert, funktioniert aber unverändert.
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedWildart = watch('wildart');
  const watchedKategorie = watch('kategorie');
  const watchedFachbegriff = watch('fachbegriff');
  const watchedAltersklasse = watch('altersklasse');
  const watchedGeschlecht = watch('geschlecht');
  const watchedJaegerId = watch('jaegerId');

  const selectableJaegerProfiles = jaegerProfiles.filter(profile =>
    profile.active !== false || (editingEntry?.jaegerId && profile.id === editingEntry.jaegerId)
  );
  const adminHasSelectableProfile = selectableJaegerProfiles.length > 0;
  const adminNeedsJaegerSelection = isAdmin && !watchedJaegerId;

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
        jaegerId: editingEntry.jaegerId ?? '',
        ort: editingEntry.ort ?? '',
        einnahmen: editingEntry.einnahmen != null ? String(editingEntry.einnahmen) : '',
        notizen: editingEntry.notizen ?? '',
        jagdbezirkId: editingEntry.jagdbezirkId ?? '',
        userId: editingEntry.userId ?? ''
      });
      trigger();
    }
  }, [editingEntry, reset, trigger]);

  useEffect(() => {
    if (editingEntry || currentUser?.role !== 'user') return;

    setValue('jaeger', assignedJaegerName, { shouldValidate: true });
    setValue('jaegerId', currentUser?.jaegerId ?? '', { shouldValidate: true });
    trigger(['jaeger', 'jaegerId']);
  }, [assignedJaegerName, currentUser?.jaegerId, currentUser?.role, editingEntry, setValue, trigger]);

  useEffect(() => {
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') {
      setJaegerProfiles([]);
      setLoadingJaegerProfiles(false);
      return;
    }

    const bezirkId = currentUser.jagdbezirkId;
    setLoadingJaegerProfiles(true);

    return onSnapshot(
      collection(db, `jagdbezirke/${bezirkId}/jaeger`),
      (snapshot) => {
        const loadedProfiles = snapshot.docs
          .map(d => ({
            id: d.id,
            displayName: d.data().displayName || d.id,
            jagdbezirkId: bezirkId,
            active: d.data().active,
          } as JaegerProfile))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));

        setJaegerProfiles(loadedProfiles);
        setLoadingJaegerProfiles(false);
      },
      (error) => {
        console.error('Jägerprofile konnten im Eintragsformular nicht geladen werden:', error);
        setLoadingJaegerProfiles(false);
      }
    );
  }, [currentUser?.jagdbezirkId, currentUser?.role]);

  useEffect(() => {
    if (!isAdmin) return;

    const selectedProfile = jaegerProfiles.find(profile => profile.id === watchedJaegerId);
    if (!selectedProfile) {
      setValue('jaeger', '', { shouldValidate: true });
      return;
    }

    setValue('jaeger', selectedProfile.displayName, { shouldValidate: true });
  }, [isAdmin, jaegerProfiles, setValue, watchedJaegerId]);

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
      <h3 className="text-base font-semibold text-green-800 mb-4">
        {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
      </h3>
      {isUserWithoutAssignment && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {!currentUser?.jaegerId
            ? 'Ihr Benutzer ist noch keinem Jäger zugeordnet. Bitte wenden Sie sich an den Administrator, bevor Sie Abschüsse erfassen.'
            : 'Das zugeordnete Jägerprofil konnte nicht geladen werden. Bitte wenden Sie sich an den Administrator.'}
        </div>
      )}
      {isAdmin && !loadingJaegerProfiles && !adminHasSelectableProfile && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Es sind keine aktiven Jägerprofile verfügbar. Bitte aktiviere oder erstelle zuerst ein Jägerprofil in der Benutzerverwaltung.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-5">
        <input type="hidden" {...register('jaegerId')} />
        <section aria-labelledby="pflichtangaben-title" className="space-y-4">
        <h4 id="pflichtangaben-title" className="text-sm font-semibold text-green-900">Pflichtangaben</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Datum *</label>
            <input
              type="date"
              {...register('datum')}
              className={`min-h-11 w-full min-w-0 max-w-full rounded-lg border px-3 py-2 text-base [appearance:textfield] [-webkit-appearance:none] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
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
              className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
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
              className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 disabled:bg-gray-100 ${
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
        </section>

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

        <section aria-labelledby="zuordnung-title" className="space-y-3">
        <h4 id="zuordnung-title" className="text-sm font-semibold text-green-900">Zuordnung und Messwerte</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gewicht (kg)</label>
            <input
              type="number"
              step="0.1"
              {...register('gewicht')}
              className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
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
                className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
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
            {isAdmin ? (
              <>
                <select
                  value={watchedJaegerId || ''}
                  onChange={(e) => {
                    setValue('jaegerId', e.target.value, { shouldValidate: true })
                    trigger(['jaegerId', 'jaeger'])
                  }}
                  disabled={loadingJaegerProfiles || !adminHasSelectableProfile}
                  className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                    errors.jaeger ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Bitte wählen...</option>
                  {selectableJaegerProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName}{profile.active === false ? ' (inaktiv)' : ''}
                    </option>
                  ))}
                </select>
                {adminNeedsJaegerSelection && (
                  <p className="text-red-500 text-sm mt-1">Bitte ein aktives Jägerprofil auswählen.</p>
                )}
              </>
            ) : (
              <>
                <input
                  type="text"
                  {...register('jaeger')}
                  readOnly
                  className={`min-h-11 w-full rounded-lg border bg-gray-50 px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                    errors.jaeger ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.jaeger && (
                  <p className="text-red-500 text-sm mt-1">{errors.jaeger.message}</p>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ort/Revier</label>
            <input
              type="text"
              {...register('ort')}
              className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
                errors.ort ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.ort && (
              <p className="text-red-500 text-sm mt-1">{errors.ort.message}</p>
            )}
          </div>
        </div>
        </section>

        <details className="group rounded-xl border border-green-200 bg-green-50/40" open={Boolean(editingEntry)}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-semibold text-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2">
            Weitere Angaben
            <span aria-hidden="true" className="text-sm transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none">⌄</span>
          </summary>
          <div className="space-y-4 border-t border-green-100 px-4 py-4">
          <h4 className="text-sm font-semibold text-green-900">Besondere Umstände</h4>
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
            <label id="sonstige-anzahl-label" className="text-sm font-medium">Anzahl</label>
            <div className="flex items-center gap-1" role="group" aria-labelledby="sonstige-anzahl-label">
              <button
                type="button"
                onClick={() => handleSonstigeAnzahlChange(sonstigeAnzahl - 1)}
                disabled={sonstigeAnzahl <= 1}
                aria-label="Anzahl verringern"
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-gray-300 text-lg font-medium hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
              >−</button>
              <span className="w-8 text-center font-semibold" aria-live="polite" aria-atomic="true">{sonstigeAnzahl}</span>
              <button
                type="button"
                onClick={() => handleSonstigeAnzahlChange(sonstigeAnzahl + 1)}
                aria-label="Anzahl erhöhen"
                className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-gray-300 text-lg font-medium hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
              >+</button>
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-3 text-sm font-semibold text-green-900">Dokumentation</h4>
          <label className="block text-sm font-medium mb-1">Bemerkung</label>
          <input
            type="text"
            {...register('bemerkung')}
            className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
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
            className={`min-h-11 w-full rounded-lg border px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 ${
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
            className={`w-full border rounded-lg px-3 py-2 h-20 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 ${
              errors.notizen ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Weitere Details zum Abschuss..."
          />
          {errors.notizen && (
            <p className="text-red-500 text-sm mt-1">{errors.notizen.message}</p>
          )}
        </div>
          </div>
        </details>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={!isValid || loading || isUserWithoutAssignment || loadingJaegerProfiles || adminNeedsJaegerSelection || (isAdmin && !adminHasSelectableProfile)}
            className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-2 text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300 sm:w-auto"
          >
            {loading ? <Spinner size={20} /> : null}
            {loading ? (editingEntry ? 'Aktualisiere...' : 'Speichere...') : (editingEntry ? 'Aktualisieren' : 'Speichern')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full cursor-pointer rounded-xl border border-gray-300 px-6 py-2 text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800 sm:w-auto"
            disabled={loading}
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
};

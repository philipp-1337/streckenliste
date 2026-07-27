import { useState, useCallback, lazy, Suspense, useMemo, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { HomeIcon, LayoutList, Table } from 'lucide-react';
import usePdfExport from '@hooks/usePdfExport';
import type { Eintrag, JaegerProfile } from '@types';
import { useFirestore } from '@hooks/useFirestore';
import { useStatistiken } from '@hooks/useStatistiken';
import { useFilter } from '@hooks/useFilter';
import { usePwaPrompt } from '@hooks/usePwaPrompt';
import { usePwaUpdate } from '@hooks/usePwaUpdate';
import { usePushNotifications } from '@hooks/usePushNotifications';
import { usePushHint } from '@hooks/usePushHint';
import { Header } from '@components/Header';
import { ActionButtons } from '@components/ActionButtons';
import { FilterPanel } from '@components/FilterPanel';
import { Nav } from '@components/Nav';
import { EintragForm } from '@components/EintragForm';
import { EintragTable } from '@components/EintragTable';
import { FachbegriffeLegende } from '@components/FachbegriffeLegende';
import { PushSettings } from '@components/PushSettings';
import { takePendingDeepLink } from '@/lib/pendingDeepLink';
import { deactivatePushForThisDevice } from '@/lib/pushClient';
import { SkeletonTable, SkeletonStatistik } from '@components/SkeletonLoaders';
import Spinner from '@components/Spinner';
import PdfDownloadDialog from '@components/PdfDownloadDialog';
import useAuth from '@hooks/useAuth';
import Login from '@auth/Login';
import ActionHandler from '@auth/ActionHandler';
import { auth } from './firebase';
import { db } from './firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getAvailableJagdjahre, getCurrentJagdjahr } from '@utils/jagdjahrUtils';

// Stabile Leerliste, damit abgeleitete Memos bei "keine Profile" nicht bei
// jedem Render eine neue Array-Identität sehen.
const EMPTY_JAEGER_PROFILES: JaegerProfile[] = [];

const getDefaultFilterState = () => ({
  wildart: '',
  jaegerId: '',
  jahr: '',
  kategorie: '',
  jagdjahr: getCurrentJagdjahr(),
  status: ''
});

// Lazy load große Komponenten für bessere Bundle Size
const StatistikPanel = lazy(() => import('@components/StatistikPanel'));
const OfficialPrintView = lazy(() => import('@components/OfficialPrintView'));
const ImportDialog = lazy(() => import('@components/ImportDialog'));
const KategorienFixDialog = lazy(() => import('@components/KategorienFixDialog'));
const UserManagement = lazy(() => import('@components/UserManagement').then(m => ({ default: m.UserManagement })));
const AblehnungsModal = lazy(() => import('@components/AblehnungsModal').then(m => ({ default: m.AblehnungsModal })));
const HistoryModal = lazy(() => import('@components/HistoryModal').then(m => ({ default: m.HistoryModal })));

const App = () => {
  const { currentUser, loading: userLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Ziel eines angetippten Push: die Übersicht hebt diesen Eintrag hervor.
  const highlightId = searchParams.get('eintrag') ?? undefined;
  // Hier statt in PushSettings, damit der Zustand einmal ermittelt wird und der
  // Hinweis-Toast ihn auch außerhalb der Einstellungsseite kennt.
  const push = usePushNotifications();
  usePushHint(push.status);

  const [editingEntry, setEditingEntry] = useState<Eintrag | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [showLegende, setShowLegende] = useState(false);
  const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null);
  const [historyEntry, setHistoryEntry] = useState<Eintrag | null>(null);
  // Profile sind an ihren Bezirk gebunden: Passt der gespeicherte Bezirk nicht
  // mehr zum Nutzer (Logout, Bezirkswechsel), gilt die Liste als leer, ohne
  // dass ein Effect den State zurücksetzen muss.
  const [loadedJaegerProfiles, setLoadedJaegerProfiles] = useState<{ bezirkId: string; profiles: JaegerProfile[] }>({ bezirkId: '', profiles: [] });
  const jaegerProfiles = loadedJaegerProfiles.bezirkId === currentUser?.jagdbezirkId
    ? loadedJaegerProfiles.profiles
    : EMPTY_JAEGER_PROFILES;
  // Login-Flow Flag
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>(() => {
    try { return (localStorage.getItem('eintragTableMobileView') as 'cards' | 'table') || 'table'; } catch { return 'table'; }
  });
  const toggleMobileView = (view: 'cards' | 'table') => {
    setMobileViewMode(view);
    try { localStorage.setItem('eintragTableMobileView', view); } catch { /* ignore */ }
  };

  // PWA Hooks - sie zeigen die Toasts selbst an
  usePwaPrompt();
  usePwaUpdate();

  const { exportPdf, isExporting: isExportingPdf, iosPdfBlob, clearIosPdf } = usePdfExport();

  // Hook für Live Daten
  const firestore = useFirestore();

  // Aktuelle Datenquelle basierend auf Modus
  const currentData = firestore;

  // Filter und Statistiken
  const { filter, setFilter, filteredEintraege } = useFilter(
    currentData.eintraege
  );
  const statistikenData = useStatistiken(filteredEintraege, filter.jagdjahr);

  // Calculate available hunting years from all entries
  const availableJagdjahre = useMemo(() =>
    getAvailableJagdjahre(currentData.eintraege),
    [currentData.eintraege]
  );

  const pendingCount = useMemo(() =>
    currentData.eintraege.filter(e => e.status === 'pending' || e.status === 'rejected').length,
    [currentData.eintraege]
  );

  // iOS ignoriert die URL von clients.openWindow(), wenn die PWA aus dem
  // vollständig geschlossenen Zustand startet, und öffnet immer die start_url.
  // Der Service Worker legt das Ziel deshalb in IndexedDB ab; hier wird es
  // einmalig nachgeholt, sobald der Nutzer geladen ist.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    void (async () => {
      const path = await takePendingDeepLink();
      if (!cancelled && path) navigate(path, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [currentUser, navigate]);

  useEffect(() => {
    const bezirkId = currentUser?.jagdbezirkId;
    if (!bezirkId) return;

    let cancelled = false;

    const loadJaegerProfiles = async () => {
      const snapshot = await getDocs(collection(db, `jagdbezirke/${bezirkId}/jaeger`));
      if (cancelled) return;

      const loadedProfiles = snapshot.docs
        .map(d => ({
          id: d.id,
          displayName: d.data().displayName || d.id,
          jagdbezirkId: bezirkId,
          active: d.data().active,
        } as JaegerProfile))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));

      setLoadedJaegerProfiles({ bezirkId, profiles: loadedProfiles });
    };

    void loadJaegerProfiles();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.jagdbezirkId]);

  const jaegerFilterOptions = useMemo(() => {
    const activeProfiles = jaegerProfiles.filter(profile => profile.active !== false);
    const options = activeProfiles.map(profile => ({
      value: profile.id,
      label: profile.displayName,
    }));

    const existingIds = new Set(options.map(option => option.value));
    const legacyProfiles = currentData.eintraege
      .filter(eintrag => eintrag.jaegerId)
      .map(eintrag => ({
        id: eintrag.jaegerId as string,
        label: eintrag.jaeger,
      }))
      .filter(profile => !existingIds.has(profile.id))
      .sort((a, b) => a.label.localeCompare(b.label, 'de'))
      .map(profile => ({
        value: profile.id,
        label: `${profile.label} (archiviert)`,
      }));

    return [...options, ...legacyProfiles];
  }, [currentData.eintraege, jaegerProfiles]);

  const handleApprove = useCallback(async (id: string) => {
    await currentData.approveEintrag(id);
  }, [currentData]);

  const handleReject = useCallback((id: string) => {
    setRejectingEntryId(id);
  }, []);

  const handleConfirmReject = useCallback(async (id: string, grund: string) => {
    await currentData.rejectEintrag(id, grund);
  }, [currentData]);

  const handleResetToPending = useCallback(async (id: string) => {
    await currentData.resetToPending(id);
  }, [currentData]);

  const handleShowHistory = useCallback((eintrag: Eintrag) => {
    setHistoryEntry(eintrag);
  }, []);

  // Handler for hunting year change
  const handleJagdjahrChange = useCallback((jagdjahr: string) => {
    setFilter(prev => ({ ...prev, jagdjahr }));
  }, [setFilter]);

  // All event handlers with useCallback to prevent unnecessary re-renders
  const handleToggleFilterPanel = useCallback(() => {
    setShowFilterPanel((v) => !v);
  }, []);
  const handleResetFilters = useCallback(() => {
    setFilter(getDefaultFilterState());
  }, [setFilter]);

  const activeFilterCount = useMemo(() => {
    const defaults = getDefaultFilterState();
    return Number(filter.wildart !== defaults.wildart) +
      Number(filter.jaegerId !== defaults.jaegerId) +
      Number(filter.jahr !== defaults.jahr) +
      Number(filter.kategorie !== defaults.kategorie) +
      Number(filter.status !== defaults.status);
  }, [filter]);
  const handleToggleNewEntryForm = useCallback(() => setShowNewEntryForm((v) => !v), []);
  const handleToggleFixDialog = useCallback(() => setShowFixDialog((v) => !v), []);
  const handleToggleImportDialog = useCallback(() => setShowImportDialog((v) => !v), []);
  const handleToggleLegende = useCallback(() => setShowLegende((v) => !v), []);

  const performLogout = useCallback(async () => {
    // Vor signOut(): der Callable braucht ein angemeldetes Konto. Ohne diesen
    // Schritt bliebe die Zuordnung Token → Konto bestehen und ein geteiltes
    // Gerät würde weiter die Benachrichtigungen des abgemeldeten Kontos
    // anzeigen. Ein Fehler hier darf das Abmelden nicht verhindern – sonst
    // hängt jemand ohne Netz in der Sitzung fest.
    try {
      await deactivatePushForThisDevice();
    } catch (error) {
      console.error("Push-Gerät konnte beim Abmelden nicht entfernt werden:", error);
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
      toast.error("Fehler beim Abmelden");
    }
  }, []);

  const handleLogout = useCallback(() => {
    toast.custom(
      (t: string | number) => (
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
          <div className="text-sm font-medium text-gray-900">Wirklich abmelden?</div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t);
                await performLogout();
              }}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition cursor-pointer"
            >
              Abmelden
            </button>
          </div>
        </div>
      ),
      { duration: 10000 }
    );
  }, [performLogout]);

  const handleSubmit = useCallback(async (data: Omit<Eintrag, "id">) => {
    try {
      if (editingEntry) {
        await currentData.updateEintrag(editingEntry.id, data);
      } else {
        await currentData.addEintrag(data);
      }
      setEditingEntry(null);
      setShowNewEntryForm(false);
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern");
    }
  }, [editingEntry, currentData]);

  const handleEdit = useCallback((eintrag: Eintrag) => {
    setEditingEntry(eintrag);
    setShowNewEntryForm(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    toast.custom(
      (t: string | number) => (
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
            <div className="text-sm font-medium text-gray-900">
              {(() => {
                const eintrag = currentData.eintraege.find(e => e.id === id);
                let dateStr = "?";
                if (eintrag?.datum) {
                  const d = new Date(eintrag.datum);
                  if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
                  } else {
                    dateStr = eintrag.datum;
                  }
                }
                return `Soll der Eintrag vom ${dateStr} wirklich gelöscht werden?`;
              })()}
            </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={async () => {
                try {
                  await currentData.deleteEintrag(id);
                  toast.dismiss(t);
                } catch (error) {
                  console.error("Fehler beim Löschen:", error);
                  toast.error("Fehler beim Löschen");
                }
              }}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition cursor-pointer"
            >
              Löschen
            </button>
          </div>
        </div>
      ),
      { duration: 10000 }
    );
  }, [currentData]);

  const handleFormClose = useCallback(() => {
    setEditingEntry(null);
    setShowNewEntryForm(false);
  }, []);

  const handleImport = useCallback(async (eintraege: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]) => {
    await currentData.importEintraege(eintraege);
  }, [currentData]);

  // Auth action handler (password reset etc.) — accessible without login
  if (location.pathname === '/auth/action') {
    return (
      <>
        <Toaster richColors position="top-right" offset={32} />
        <ActionHandler />
      </>
    );
  }

  // Setze isLoggingIn zurück, sobald User und Daten geladen sind
  if (isLoggingIn && currentUser && !currentData.loading) {
    setTimeout(() => setIsLoggingIn(false), 0);
  }

  return (
    <>
      <Toaster
        richColors={true}
        position="top-right"
        mobileOffset={32}
        offset={32}
        closeButton={false}
        expand={true}
        invert={false}
        gap={16}
        toastOptions={{
          style: {
            pointerEvents: 'auto',
          },
        }}
      />
      {/* Early returns nach Toaster! */}
      {userLoading ? (
        <div className="flex flex-col items-center justify-center h-screen bg-green-50">
          <Spinner size={64} className="mb-4" />
          <p className="text-xl text-green-900/70">Benutzerdaten werden geladen...</p>
        </div>
      ) : !currentUser ? (
        <Login isLoggingIn={isLoggingIn} setIsLoggingIn={setIsLoggingIn} />
      ) : currentData.loading || isLoggingIn ? (
        <div className="min-h-screen bg-green-50 p-4">
          <div className="max-w-7xl mx-auto">
            <Header 
              jagdjahr={filter.jagdjahr}
              availableJagdjahre={availableJagdjahre}
              onJagdjahrChange={handleJagdjahrChange}
            />
            <div className="space-y-6 mt-6">
              <SkeletonTable />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonStatistik />
                <SkeletonStatistik />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isExportingPdf && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
              <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
                <Spinner size={64} className="mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">PDF wird erstellt...</h3>
                <p className="text-gray-600 text-sm">Einen Moment bitte.</p>
              </div>
            </div>
          )}
          {iosPdfBlob && (
            <PdfDownloadDialog
              blob={iosPdfBlob}
              filename={`Streckenliste_${(filter.jagdjahr || 'Alle').replace('/', '-')}.pdf`}
              onClose={clearIosPdf}
              onPrint={() => { clearIosPdf(); navigate('/print'); }}
            />
          )}
          <div className="min-h-screen bg-green-50 p-4">
            <div className="max-w-7xl mx-auto pb-16">
              <Header
                jagdjahr={location.pathname === '/users' ? undefined : filter.jagdjahr}
                availableJagdjahre={location.pathname === '/users' ? undefined : availableJagdjahre}
                onJagdjahrChange={location.pathname === '/users' ? undefined : handleJagdjahrChange}
              />
              <Routes>
                <Route path="/" element={
                  <>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 shrink-0">
                        <HomeIcon size={20} strokeWidth={2} />
                        Übersicht
                      </h2>
                      <ActionButtons
                        showFilter={showFilterPanel}
                        showNewEntryForm={showNewEntryForm}
                        onToggleFilterPanel={handleToggleFilterPanel}
                        onToggleNewEntryForm={handleToggleNewEntryForm}
                        onToggleImportDialog={handleToggleImportDialog}
                        onToggleFixDialog={handleToggleFixDialog}
                        onExportPdf={() => {
                          const jagdbezirk = currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || 'Unbekannt';
                          exportPdf(filteredEintraege, filter.jagdjahr, jagdbezirk);
                        }}
                        isExportingPdf={isExportingPdf}
                        onToggleLegende={handleToggleLegende}
                        showLegende={showLegende}
                        currentUser={currentUser}
                        activeFilterCount={activeFilterCount}
                      />
                    </div>
                    {/* Inline Formular über der Tabelle */}
                    {(showNewEntryForm || editingEntry) && (
                      <div className="mx-auto mb-6">
                        <EintragForm
                          editingEntry={editingEntry}
                          onSubmit={async (data) => {
                            await handleSubmit(data);
                            handleFormClose();
                          }}
                          onCancel={handleFormClose}
                          />
                      </div>
                    )}
                    {showFilterPanel && (
                      <FilterPanel
                        filter={filter}
                        onFilterChange={setFilter}
                        onResetFilters={handleResetFilters}
                        jaegerOptions={jaegerFilterOptions}
                      />
                    )}
                    {showLegende && <FachbegriffeLegende />}
                    {!(showNewEntryForm || editingEntry) && (
                      <>
                        <div className="flex items-center mb-2">
                          {/* Mobile view toggle */}
                          <div className="sm:hidden flex items-center gap-0.5 bg-green-800/5 rounded-lg p-0.5">
                            <button
                              onClick={() => toggleMobileView('cards')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${mobileViewMode === 'cards' ? 'bg-white shadow-sm text-green-800' : 'text-green-900/80'}`}
                              aria-label="Kartenansicht"
                            >
                              <LayoutList size={12} />
                              Karten
                            </button>
                            <button
                              onClick={() => toggleMobileView('table')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${mobileViewMode === 'table' ? 'bg-white shadow-sm text-green-800' : 'text-green-900/80'}`}
                              aria-label="Tabellenansicht"
                            >
                              <Table size={12} />
                              Tabelle
                            </button>
                          </div>
                          <span className="text-xs text-green-900/80 tabular-nums ml-auto">
                            {filteredEintraege.length} von {currentData.eintraege.length} Einträge
                          </span>
                        </div>
                        <EintragTable
                          eintraege={filteredEintraege}
                          jaegerProfiles={jaegerProfiles}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onApprove={handleApprove}
                          onReject={handleReject}
                          onResetToPending={handleResetToPending}
                          onShowHistory={handleShowHistory}
                          currentUser={currentUser}
                          mobileViewMode={mobileViewMode}
                          highlightId={highlightId}
                        />
                      </>
                    )}
                  </>
                } />
                <Route path="/form" element={
                  <EintragForm
                    editingEntry={editingEntry}
                    onSubmit={handleSubmit}
                    onCancel={handleFormClose}
                  />
                } />
                <Route path="/stats" element={
                  <Suspense fallback={<SkeletonStatistik />}>
                    <StatistikPanel data={statistikenData} />
                  </Suspense>
                } />
                <Route path="/legende" element={<FachbegriffeLegende />} />
                <Route path="/users" element={
                  <Suspense fallback={<div className="p-4">Wird geladen...</div>}>
                    <UserManagement />
                  </Suspense>
                } />

                <Route path="/einstellungen" element={
                  <>
                    <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
                      Einstellungen
                    </h2>
                    <PushSettings
                      status={push.status}
                      level={push.level}
                      isBusy={push.isBusy}
                      onToggle={() => void push.toggle()}
                      onChangeLevel={(level) => void push.changeLevel(level)}
                    />
                  </>
                } />

                <Route path="/print" element={
                  <Suspense fallback={<div className="p-4">Wird geladen...</div>}>
                    <OfficialPrintView eintraege={filteredEintraege} jagdjahr={filter.jagdjahr} />
                  </Suspense>
                } />
              </Routes>
            </div>
          </div>
          <Nav onLogout={handleLogout} currentUser={currentUser} pendingCount={pendingCount} />
          <Suspense fallback={null}>
            <ImportDialog
              isOpen={showImportDialog}
              onClose={() => setShowImportDialog(false)}
              onImport={handleImport}
            />
          </Suspense>
          <Suspense fallback={null}>
            <KategorienFixDialog
              isOpen={showFixDialog}
              onClose={() => setShowFixDialog(false)}
            />
          </Suspense>
          <Suspense fallback={null}>
            {rejectingEntryId && (
              <AblehnungsModal
                eintragId={rejectingEntryId}
                onConfirm={handleConfirmReject}
                onClose={() => setRejectingEntryId(null)}
              />
            )}
          </Suspense>
          <Suspense fallback={null}>
            {historyEntry && (
              <HistoryModal
                eintragId={historyEntry.id}
                wildart={historyEntry.wildart}
                datum={historyEntry.datum}
                onClose={() => setHistoryEntry(null)}
                getHistory={currentData.getHistory}
              />
            )}
          </Suspense>
        </>
      )}
    </>
  );
};

export default App;

import { useState, useCallback, lazy, Suspense, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { HomeIcon } from 'lucide-react';
import usePdfExport from '@hooks/usePdfExport';
import type { Eintrag } from '@types';
import { useFirestore } from '@hooks/useFirestore';
import { useStatistiken } from '@hooks/useStatistiken';
import { useFilter } from '@hooks/useFilter';
import { usePwaPrompt } from '@hooks/usePwaPrompt';
import { usePwaUpdate } from '@hooks/usePwaUpdate';
import { Header } from '@components/Header';
import { ActionButtons } from '@components/ActionButtons';
import { FilterPanel } from '@components/FilterPanel';
import { Nav } from '@components/Nav';
import { EintragForm } from '@components/EintragForm';
import { EintragTable } from '@components/EintragTable';
import { FachbegriffeLegende } from '@components/FachbegriffeLegende';
import { SkeletonTable, SkeletonStatistik } from '@components/SkeletonLoaders';
import Spinner from '@components/Spinner';
import PdfDownloadDialog from '@components/PdfDownloadDialog';
import useAuth from '@hooks/useAuth';
import Login from '@auth/Login';
import ActionHandler from '@auth/ActionHandler';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { getAvailableJagdjahre, getCurrentJagdjahr } from '@utils/jagdjahrUtils';

const getDefaultFilterState = () => ({
  wildart: '',
  jaeger: '',
  jahr: '',
  kategorie: '',
  jagdjahr: getCurrentJagdjahr()
});

// Lazy load große Komponenten für bessere Bundle Size
const StatistikPanel = lazy(() => import('@components/StatistikPanel'));
const OfficialPrintView = lazy(() => import('@components/OfficialPrintView'));
const ImportDialog = lazy(() => import('@components/ImportDialog'));
const KategorienFixDialog = lazy(() => import('@components/KategorienFixDialog'));
const FreigabenView = lazy(() => import('@components/FreigabenView').then(m => ({ default: m.FreigabenView })));
const UserManagement = lazy(() => import('@components/UserManagement').then(m => ({ default: m.UserManagement })));

const App = () => {
  const { currentUser, loading: userLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [editingEntry, setEditingEntry] = useState<Eintrag | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);
  const [showLegende, setShowLegende] = useState(false);
  // Login-Flow Flag
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
  const statistiken = useStatistiken(filteredEintraege);

  // Calculate available hunting years from all entries
  const availableJagdjahre = useMemo(() =>
    getAvailableJagdjahre(currentData.eintraege),
    [currentData.eintraege]
  );

  const pendingCount = useMemo(() =>
    currentData.eintraege.filter(e => e.status === 'pending').length,
    [currentData.eintraege]
  );

  const handleApprove = useCallback(async (id: string) => {
    await currentData.approveEintrag(id);
  }, [currentData]);

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
      Number(filter.jaeger !== defaults.jaeger) +
      Number(filter.jahr !== defaults.jahr) +
      Number(filter.kategorie !== defaults.kategorie);
  }, [filter]);
  const handleToggleNewEntryForm = useCallback(() => setShowNewEntryForm((v) => !v), []);
  const handleToggleFixDialog = useCallback(() => setShowFixDialog((v) => !v), []);
  const handleToggleImportDialog = useCallback(() => setShowImportDialog((v) => !v), []);
  const handleToggleLegende = useCallback(() => setShowLegende((v) => !v), []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
      toast.error("Fehler beim Abmelden");
    }
  }, []);

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
                jagdjahr={filter.jagdjahr}
                availableJagdjahre={availableJagdjahre}
                onJagdjahrChange={handleJagdjahrChange}
              />
              <Routes>
                <Route path="/" element={
                  <>
                    <div className="flex items-center justify-between gap-4 mb-6">
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
                      />
                    )}
                    {showLegende && <FachbegriffeLegende />}
                    {!(showNewEntryForm || editingEntry) && (
                      <>
                        <div className="flex justify-end mb-2">
                          <span className="text-xs text-green-900/40 tabular-nums">
                            {filteredEintraege.length} von {currentData.eintraege.length} Einträge
                          </span>
                        </div>
                        <EintragTable
                          eintraege={filteredEintraege}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onApprove={handleApprove}
                          currentUser={currentUser}
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
                    <StatistikPanel stats={statistiken} />
                  </Suspense>
                } />
                <Route path="/legende" element={<FachbegriffeLegende />} />
                <Route path="/users" element={
                  <Suspense fallback={<div className="p-4">Wird geladen...</div>}>
                    <UserManagement />
                  </Suspense>
                } />
                <Route path="/freigaben" element={
                  <Suspense fallback={<div className="p-4">Wird geladen...</div>}>
                    <FreigabenView
                      eintraege={currentData.eintraege}
                      currentUser={currentUser}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onApprove={handleApprove}
                    />
                  </Suspense>
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
        </>
      )}
    </>
  );
};

export default App;

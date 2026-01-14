import { useState, useCallback, lazy, Suspense } from 'react';
import { Toaster, toast } from 'sonner';
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
import useAuth from '@hooks/useAuth';
import Login from '@auth/Login';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { Routes, Route } from 'react-router-dom';

// Lazy load große Komponenten für bessere Bundle Size
const StatistikPanel = lazy(() => import('@components/StatistikPanel'));
const OfficialPrintView = lazy(() => import('@components/OfficialPrintView'));
const ImportDialog = lazy(() => import('@components/ImportDialog'));
const KategorienFixDialog = lazy(() => import('@components/KategorienFixDialog'));

const App = () => {  
  const { currentUser, loading: userLoading } = useAuth();
  const [editingEntry, setEditingEntry] = useState<Eintrag | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFixDialog, setShowFixDialog] = useState(false);

  // PWA Hooks - sie zeigen die Toasts selbst an
  usePwaPrompt();
  usePwaUpdate();

  // Hook für Live Daten
  const firestore = useFirestore();

  // Aktuelle Datenquelle basierend auf Modus
  const currentData = firestore;

  // Filter und Statistiken
  const { filter, setFilter, filteredEintraege } = useFilter(
    currentData.eintraege
  );
  const statistiken = useStatistiken(filteredEintraege);

  // All event handlers with useCallback to prevent unnecessary re-renders
  const handleToggleFilterPanel = useCallback(() => {
    setShowFilterPanel((v) => {
      // Wenn Panel geschlossen wird (v ist true -> wird false), Filter zurücksetzen
      if (v) {
        setFilter({
          wildart: '',
          jaeger: '',
          jahr: '',
          kategorie: ''
        });
      }
      return !v;
    });
  }, [setFilter]);
  const handleToggleNewEntryForm = useCallback(() => setShowNewEntryForm((v) => !v), []);
  const handleToggleFixDialog = useCallback(() => setShowFixDialog((v) => !v), []);
  const handleToggleImportDialog = useCallback(() => setShowImportDialog((v) => !v), []);

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
  }, [editingEntry, currentData, firestore.error]);

  const handleEdit = useCallback((eintrag: Eintrag) => {
    setEditingEntry(eintrag);
    setShowNewEntryForm(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    toast.custom(
      (t: string | number) => (
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
          <div className="text-sm font-medium text-gray-900">
            Eintrag wirklich löschen?
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
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
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition"
            >
              Löschen
            </button>
          </div>
        </div>
      ),
      { duration: 10000 }
    );
  }, [currentData, firestore.error]);

  const handleFormClose = useCallback(() => {
    setEditingEntry(null);
    setShowNewEntryForm(false);
  }, []);

  const handleImport = useCallback(async (eintraege: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]) => {
    await currentData.importEintraege(eintraege);
  }, [currentData]);

  // Early returns after all hooks
  if (userLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-green-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
        <p className="text-xl text-gray-700">Benutzerdaten werden geladen...</p>
      </div>
    );
  }
  if (!currentUser) {
    return <Login />;
  }

  // Loading screen für Firestore-Daten nach dem Login
  if (currentData.loading) {
    return (
      <div className="min-h-screen bg-green-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Header onLogout={handleLogout} />
          <div className="space-y-6 mt-6">
            <SkeletonTable />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonStatistik />
              <SkeletonStatistik />
            </div>
          </div>
        </div>
      </div>
    );
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
      <div className="min-h-screen bg-green-50 p-4">
        <div className="max-w-7xl mx-auto pb-16">
          <Header onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={
              <>
                <ActionButtons
                  showFilter={showFilterPanel}
                  showNewEntryForm={showNewEntryForm}
                  onToggleFilterPanel={handleToggleFilterPanel}
                  onToggleNewEntryForm={handleToggleNewEntryForm}
                  onToggleImportDialog={handleToggleImportDialog}
                  onToggleFixDialog={handleToggleFixDialog}
                  currentUser={currentUser}
                />
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
                  <FilterPanel filter={filter} onFilterChange={setFilter} />
                )}
                {!(showNewEntryForm || editingEntry) && (
                <EintragTable
                  eintraege={filteredEintraege}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  currentUser={currentUser}
                />
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
            <Route path="/print" element={
              <Suspense fallback={<div className="p-4">Wird geladen...</div>}>
                <OfficialPrintView eintraege={filteredEintraege} />
              </Suspense>
            } />
          </Routes>
        </div>
      </div>
      <Nav onLogout={handleLogout} />
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
  );
};

export default App;

import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import type { Eintrag } from '@types';
import { useFirestore } from '@hooks/useFirestore';
import { useStatistiken } from '@hooks/useStatistiken';
import { useFilter } from '@hooks/useFilter';
import { Header } from '@components/Header';
import { ActionButtons } from '@components/ActionButtons';
import { FilterPanel } from '@components/FilterPanel';
import { StatistikPanel } from '@components/StatistikPanel';
import { EintragForm } from '@components/EintragForm';
import { EintragTable } from '@components/EintragTable';
import { FachbegriffeLegende } from '@components/FachbegriffeLegende';
import { OfficialPrintView } from '@components/OfficialPrintView';
import useAuth from '@hooks/useAuth';
import Login from '@auth/Login';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { Routes, Route } from 'react-router-dom';

const App = () => {  
  const { currentUser, loading: userLoading } = useAuth();
  const [editingEntry, setEditingEntry] = useState<Eintrag | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showNewEntryForm, setShowNewEntryForm] = useState(false);

  // Hook für Live Daten
  const firestore = useFirestore();

  // Aktuelle Datenquelle basierend auf Modus
  const currentData = firestore;

  // Filter und Statistiken
  const { filter, setFilter, filteredEintraege } = useFilter(
    currentData.eintraege
  );
  const statistiken = useStatistiken(filteredEintraege);

  // Toggle function for FilterPanel
  const handleToggleFilterPanel = () => setShowFilterPanel((v) => !v);
  // entfernt: handleShowNewEntryForm
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Benutzerdaten werden geladen...
      </div>
    );
  }
  if (!currentUser) {
    return <Login />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
      toast.error("Fehler beim Abmelden");
    }
  };


  const handleSubmit = async (data: Omit<Eintrag, "id">) => {
    try {
      if (editingEntry) {
        await currentData.updateEintrag(editingEntry.id, data);
      } else {
        await currentData.addEintrag(data);
      }
      handleFormClose();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      if (firestore.error === "In der Demo sind Funktionen eingeschränkt.")
        return;
      toast.error("Fehler beim Speichern");
    }
  };

  const handleEdit = (eintrag: Eintrag) => {
    setEditingEntry(eintrag);
    setShowNewEntryForm(false);
  };

  const handleDelete = async (id: string) => {
    toast.custom(
      (t: string | number) => (
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4 dark:bg-neutral-900 dark:border-neutral-700">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Eintrag wirklich löschen?
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-800 transition"
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
                  if (
                    firestore.error ===
                    "In der Demo sind Funktionen eingeschränkt."
                  )
                    return;
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
  };

  const handleFormClose = () => {
    setEditingEntry(null);
    setShowNewEntryForm(false);
  };



  return (
    <>
      <Toaster
        richColors={true}
        position="bottom-right"
        mobileOffset={32}
        offset={32}
        closeButton={false}
        expand={true}
        invert={false}
        gap={16}
      />
      <div className="min-h-screen bg-green-50 p-4">
        <div className="max-w-7xl mx-auto">
          <Header onLogout={handleLogout} />
          {/* {firestore.error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {firestore.error}
            </div>
          )} */}
          <Routes>
            <Route path="/" element={
              <>
                <ActionButtons
                  showFilter={showFilterPanel}
                  showNewEntryForm={showNewEntryForm}
                  onToggleFilterPanel={handleToggleFilterPanel}
                  onToggleNewEntryForm={() => setShowNewEntryForm((v) => !v)}
                />
                {showFilterPanel && (
                  <FilterPanel filter={filter} onFilterChange={setFilter} />
                )}
                {/* Inline Formular über der Tabelle */}
                {(showNewEntryForm || editingEntry) && (
                  <div className="max-w-2xl mx-auto mb-6">
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
                <EintragTable
                  eintraege={filteredEintraege}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  currentUser={currentUser}
                />
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
              <StatistikPanel stats={statistiken} />
            } />
            <Route path="/legende" element={<FachbegriffeLegende />} />
            <Route path="/print" element={
              <OfficialPrintView eintraege={filteredEintraege} />
            } />
          </Routes>
        </div>
      </div>
    </>
  );
};

export default App;

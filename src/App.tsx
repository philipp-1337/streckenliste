
import { useState, useEffect } from 'react';
import type { Eintrag } from '@types';
import { useFirestore } from '@hooks/useFirestore';
import { useDemoData } from '@hooks/useDemoData';
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
import { exportToCSV } from './utils/csvExport';
import useAuth from '@auth/AuthContext';
import Login from '@auth/Login';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';

const App = () => {
  const { currentUser } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Eintrag | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showFilter, setShowFilter] = useState(true);
  const [showOfficialPrintView, setShowOfficialPrintView] = useState(false);

  // Hooks für Demo und Live Daten
  const firestore = useFirestore();
  const demoData = useDemoData();

  // Aktuelle Datenquelle basierend auf Modus
  const currentData = isDemoMode ? demoData : firestore;
  
  // Filter und Statistiken
  const { filter, setFilter, filteredEintraege } = useFilter(currentData.eintraege);
  const statistiken = useStatistiken(filteredEintraege);

  // Daten laden beim Wechsel des Modus
  useEffect(() => {
    if (!isDemoMode) {
      firestore.getEintraege();
    }
  }, [isDemoMode, firestore]);

  if (!currentUser) {
    return <Login />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
    }
  };

  const handleToggleMode = () => {
    setIsDemoMode(!isDemoMode);
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleNewEntry = () => {
    setEditingEntry(null);
    setShowForm(!showForm);
  };

  const handleSubmit = async (data: Omit<Eintrag, 'id'>) => {
    try {
      if (editingEntry) {
        await currentData.updateEintrag(editingEntry.id, data);
      } else {
        await currentData.addEintrag(data);
      }
      handleFormClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      // Hier könnte eine Fehlermeldung angezeigt werden
    }
  };

  const handleEdit = (eintrag: Eintrag) => {
    setEditingEntry(eintrag);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Eintrag wirklich löschen?')) {
      try {
        await currentData.deleteEintrag(id);
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
      }
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredEintraege);
  };

  const handlePrint = () => {
    setShowOfficialPrintView(true);
  };

  const handleClosePrintView = () => {
    setShowOfficialPrintView(false);
  };

  return (
    <div className="min-h-screen bg-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        <Header 
          isDemoMode={isDemoMode}
          onToggleMode={handleToggleMode}
          onLogout={handleLogout}
        />

        <ActionButtons
          onNewEntry={handleNewEntry}
          onToggleStats={() => setShowStats(!showStats)}
          onExportCSV={handleExportCSV}
          onPrint={handlePrint}
          onToggleFilter={() => setShowFilter(!showFilter)}
          showFilter={showFilter}
        />

        {showFilter && (
          <FilterPanel
            filter={filter}
            onFilterChange={setFilter}
          />
        )}

        {showStats && (
          <StatistikPanel stats={statistiken} />
        )}

        {showForm && (
          <EintragForm
            editingEntry={editingEntry}
            onSubmit={handleSubmit}
            onCancel={handleFormClose}
          />
        )}

        <EintragTable
          eintraege={filteredEintraege}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentUser={currentUser}
        />

        <FachbegriffeLegende />

        {!isDemoMode && firestore.error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {firestore.error}
          </div>
        )}
      </div>

      {showOfficialPrintView && (
        <OfficialPrintView 
          eintraege={filteredEintraege} 
          onClose={handleClosePrintView} 
        />
      )}
    </div>
  );
};

export default App;

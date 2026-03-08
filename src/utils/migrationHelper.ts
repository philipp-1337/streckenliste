/**
 * Migrations-Script für die Browser-Konsole
 * 
 * VERWENDUNG:
 * 1. Öffne die Browser-Konsole (F12)
 * 2. Kopiere und führe dieses Script aus
 * 3. Rufe auf: await migrateKategorien()
 * 
 * Optional mit Vorschau:
 * - await previewMigration() - zeigt nur was geändert würde
 * - await migrateKategorien() - führt die Änderungen durch
 */

import { fixKategorienFuerJagdbezirk, previewKategorienKorrektur } from './fixKategorien';

type MigrationFn = (jagdbezirkId: string) => Promise<unknown>;

interface MigrationWindow extends Window {
  migrateKategorien?: MigrationFn;
  previewMigration?: MigrationFn;
}

// Diese Funktion kann direkt in der Konsole aufgerufen werden
export const migrateKategorien = async (jagdbezirkId: string) => {
  console.log('🔍 Starte Kategorien-Migration...');
  
  try {
    const result = await fixKategorienFuerJagdbezirk(jagdbezirkId);
    
    console.log('✅ Migration abgeschlossen!');
    console.log(`📊 Statistik:`);
    console.log(`   - Geprüft: ${result.gesamt} Einträge`);
    console.log(`   - Korrigiert: ${result.korrigiert} Einträge`);
    console.log(`   - Fehler: ${result.fehler} Einträge`);
    
    if (result.details.length > 0) {
      console.log('\n📝 Details der Korrekturen:');
      console.table(result.details);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Fehler bei der Migration:', error);
    throw error;
  }
};

export const previewMigration = async (jagdbezirkId: string) => {
  console.log('🔍 Lade Vorschau...');
  
  try {
    const result = await previewKategorienKorrektur(jagdbezirkId);
    
    console.log('📊 Vorschau:');
    console.log(`   - Gesamt: ${result.gesamt} Einträge`);
    console.log(`   - Zu korrigieren: ${result.zuKorrigieren} Einträge`);
    
    if (result.vorschau.length > 0) {
      console.log('\n📋 Einträge die korrigiert werden:');
      console.table(result.vorschau);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Fehler bei der Vorschau:', error);
    throw error;
  }
};

// Exportiere beide Funktionen für window-Objekt
if (typeof window !== 'undefined') {
  const migrationWindow = window as MigrationWindow;
  migrationWindow.migrateKategorien = migrateKategorien;
  migrationWindow.previewMigration = previewMigration;
  console.log('✅ Migrations-Funktionen verfügbar:');
  console.log('   - previewMigration(jagdbezirkId) - Vorschau');
  console.log('   - migrateKategorien(jagdbezirkId) - Migration durchführen');
}

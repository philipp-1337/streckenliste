import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { wildarten } from '@data/wildarten';
import type { Eintrag } from '@types';

/**
 * Findet die korrekte Kategorie basierend auf Wildart, Altersklasse und Geschlecht
 */
const findKorrekteKategorie = (wildart: string, altersklasse: string, geschlecht: string): string | null => {
  const wildartInfo = wildarten[wildart];
  
  if (!wildartInfo) {
    console.warn(`Wildart nicht gefunden: ${wildart}`);
    return null;
  }
  
  // Finde den passenden Eintrag in wildarten
  const match = wildartInfo.find(info => 
    info.altersklasse === altersklasse && info.geschlecht === geschlecht
  );
  
  if (match) {
    return match.kategorie;
  }
  
  console.warn(`Keine Kategorie gefunden für: ${wildart}, ${altersklasse}, ${geschlecht}`);
  return null;
};

/**
 * Prüft, ob eine Kategorie korrigiert werden muss
 */
const istKategorieFehlerhaft = (kategorie: string): boolean => {
  const fehlerhafte = ['weibliches Wild', 'männliches Wild', 'Jungwild'];
  return fehlerhafte.includes(kategorie);
};

/**
 * Korrigiert die Kategorien in einem Jagdbezirk
 */
export const fixKategorienFuerJagdbezirk = async (jagdbezirkId: string): Promise<{
  gesamt: number;
  korrigiert: number;
  fehler: number;
  details: Array<{id: string; alt: string; neu: string; wildart: string}>;
}> => {
  const eintraegeRef = collection(db, `jagdbezirke/${jagdbezirkId}/eintraege`);
  
  try {
    console.log('Lade Einträge...');
    const snapshot = await getDocs(eintraegeRef);
    const eintraege = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Eintrag));
    
    console.log(`${eintraege.length} Einträge geladen`);
    
    let korrigiert = 0;
    let fehler = 0;
    const details: Array<{id: string; alt: string; neu: string; wildart: string}> = [];
    
    // Verwende Batch für effizientere Updates
    const batch = writeBatch(db);
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore Limit
    
    for (const eintrag of eintraege) {
      // Prüfe nur Einträge mit fehlerhafter Kategorie
      if (istKategorieFehlerhaft(eintrag.kategorie)) {
        const neueKategorie = findKorrekteKategorie(
          eintrag.wildart,
          eintrag.altersklasse,
          eintrag.geschlecht
        );
        
        if (neueKategorie) {
          const docRef = doc(db, `jagdbezirke/${jagdbezirkId}/eintraege`, eintrag.id);
          batch.update(docRef, { kategorie: neueKategorie });
          
          details.push({
            id: eintrag.id,
            alt: eintrag.kategorie,
            neu: neueKategorie,
            wildart: eintrag.wildart
          });
          
          korrigiert++;
          batchCount++;
          
          // Commit batch wenn Limit erreicht
          if (batchCount >= MAX_BATCH_SIZE) {
            await batch.commit();
            console.log(`Batch von ${batchCount} Einträgen gespeichert`);
            batchCount = 0;
          }
        } else {
          console.error(`Konnte keine Kategorie finden für Eintrag ${eintrag.id}:`, {
            wildart: eintrag.wildart,
            altersklasse: eintrag.altersklasse,
            geschlecht: eintrag.geschlecht
          });
          fehler++;
        }
      }
    }
    
    // Commit verbleibende Updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Letzter Batch von ${batchCount} Einträgen gespeichert`);
    }
    
    return {
      gesamt: eintraege.length,
      korrigiert,
      fehler,
      details
    };
  } catch (error) {
    console.error('Fehler beim Korrigieren der Kategorien:', error);
    throw error;
  }
};

/**
 * Gibt eine Vorschau der zu korrigierenden Einträge zurück (ohne zu speichern)
 */
export const previewKategorienKorrektur = async (jagdbezirkId: string): Promise<{
  gesamt: number;
  zuKorrigieren: number;
  vorschau: Array<{
    id: string;
    datum: string;
    wildart: string;
    altKategorie: string;
    neueKategorie: string | null;
    altersklasse: string;
    geschlecht: string;
  }>;
}> => {
  const eintraegeRef = collection(db, `jagdbezirke/${jagdbezirkId}/eintraege`);
  
  try {
    const snapshot = await getDocs(eintraegeRef);
    const eintraege = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Eintrag));
    
    const vorschau = eintraege
      .filter(eintrag => istKategorieFehlerhaft(eintrag.kategorie))
      .map(eintrag => ({
        id: eintrag.id,
        datum: eintrag.datum,
        wildart: eintrag.wildart,
        altKategorie: eintrag.kategorie,
        neueKategorie: findKorrekteKategorie(
          eintrag.wildart,
          eintrag.altersklasse,
          eintrag.geschlecht
        ),
        altersklasse: eintrag.altersklasse,
        geschlecht: eintrag.geschlecht
      }));
    
    return {
      gesamt: eintraege.length,
      zuKorrigieren: vorschau.length,
      vorschau
    };
  } catch (error) {
    console.error('Fehler bei der Vorschau:', error);
    throw error;
  }
};

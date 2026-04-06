import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import type { Eintrag } from '@types';

interface MigrationResult {
  gesamt: number;
  migriert: number;
  uebersprungen: number;
}

/**
 * Backfills `fallwild` and `anzahl` fields on existing Firestore entries
 * that were created before these fields existed, deriving them from `bemerkung`.
 * Entries that already have these fields set are skipped.
 */
export const migrateFallwildAnzahl = async (jagdbezirkId: string): Promise<MigrationResult> => {
  const collectionRef = collection(db, `jagdbezirke/${jagdbezirkId}/eintraege`);
  const snapshot = await getDocs(collectionRef);

  const result: MigrationResult = { gesamt: snapshot.size, migriert: 0, uebersprungen: 0 };
  const BATCH_SIZE = 500;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const eintrag = docSnap.data() as Eintrag;

    // Skip if already migrated
    if (eintrag.fallwild !== undefined && eintrag.anzahl !== undefined) {
      result.uebersprungen++;
      continue;
    }

    const bemerkung = eintrag.bemerkung || '';
    const isFallwild = bemerkung.toLowerCase().includes('fallwild');

    let anzahl = 1;
    if (eintrag.wildart === 'Sonstige') {
      const countMatch = bemerkung.match(/^(\d+)\s*x/i);
      if (countMatch) anzahl = parseInt(countMatch[1], 10);
    }

    const update: { fallwild: boolean; anzahl: number } = { fallwild: isFallwild, anzahl };
    batch.update(doc(collectionRef, docSnap.id), update);
    batchCount++;
    result.migriert++;

    if (batchCount === BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return result;
};

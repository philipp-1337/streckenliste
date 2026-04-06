import { memo } from 'react';
import { EintragTable } from '@components/EintragTable';
import type { Eintrag, UserData } from '@types';

interface FreigabenViewProps {
  eintraege: Eintrag[];
  currentUser: UserData | null;
  onEdit: (eintrag: Eintrag) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => Promise<void>;
}

export const FreigabenView: React.FC<FreigabenViewProps> = memo(({
  eintraege,
  currentUser,
  onEdit,
  onDelete,
  onApprove,
}) => {
  const pendingEintraege = eintraege.filter(e => e.status === 'pending');

  if (pendingEintraege.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
        <p className="text-lg font-medium">Keine ausstehenden Einträge</p>
        <p className="text-sm mt-1">Alle Einträge wurden freigegeben.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-green-900 mb-4">
        Ausstehende Freigaben ({pendingEintraege.length})
      </h2>
      <EintragTable
        eintraege={pendingEintraege}
        currentUser={currentUser}
        onEdit={onEdit}
        onDelete={onDelete}
        onApprove={onApprove}
      />
    </div>
  );
});

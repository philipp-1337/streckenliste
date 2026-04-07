import { memo } from 'react';
import { ClipboardCheck } from 'lucide-react';
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
      <>
        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
          <ClipboardCheck size={20} strokeWidth={2} />
          Freigaben
        </h2>
        <div className="bg-white rounded-xl shadow p-12 text-center text-green-900/50">
          <p className="text-lg font-medium">Keine ausstehenden Einträge</p>
          <p className="text-sm mt-1">Alle Einträge wurden freigegeben.</p>
        </div>
      </>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
        <ClipboardCheck size={20} strokeWidth={2} />
        Freigaben
        <span className="ml-1 text-sm font-medium text-green-900/50">({pendingEintraege.length})</span>
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

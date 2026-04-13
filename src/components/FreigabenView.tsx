import { memo } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { EintragTable } from '@components/EintragTable';
import type { Eintrag, UserData } from '@types';

interface FreigabenViewProps {
  eintraege: Eintrag[];
  currentUser: UserData | null;
  onDelete: (id: string) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  onResetToPending: (id: string) => Promise<void>;
  onShowHistory: (eintrag: Eintrag) => void;
}

export const FreigabenView: React.FC<FreigabenViewProps> = memo(({
  eintraege,
  currentUser,
  onDelete,
  onApprove,
  onReject,
  onResetToPending,
  onShowHistory,
}) => {
  const reviewEintraege = eintraege.filter(e => e.status === 'pending' || e.status === 'rejected');
  const pendingCount = reviewEintraege.filter(e => e.status === 'pending').length;
  const rejectedCount = reviewEintraege.filter(e => e.status === 'rejected').length;

  if (reviewEintraege.length === 0) {
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
        <span className="ml-1 text-sm font-medium text-green-900/50">
          ({pendingCount} ausstehend{rejectedCount > 0 ? `, ${rejectedCount} abgelehnt` : ''})
        </span>
      </h2>
      <EintragTable
        eintraege={reviewEintraege}
        currentUser={currentUser}
        onDelete={onDelete}
        onApprove={onApprove}
        onReject={onReject}
        onResetToPending={onResetToPending}
        onShowHistory={onShowHistory}
      />
    </div>
  );
});

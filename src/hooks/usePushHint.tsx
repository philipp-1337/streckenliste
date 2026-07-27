import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { BellIcon, XIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PUSH_HINT_DELAY, PUSH_HINT_DISMISSED_KEY } from '@constants';
import { isStandalonePwa } from '@/lib/messaging';
import type { PushStatus } from '@hooks/usePushNotifications';

const TOAST_ID = 'push-hint-toast';

// Der Hinweis ist bewusst dauerhaft abwählbar. Ohne gespeicherte Ablehnung
// käme er in jeder Sitzung wieder und würde zum Störfaktor – gerade weil das
// Abmelden die Push-Registrierung absichtlich entfernt und der Zustand
// "inaktiv" damit regelmäßig auftritt.
const wasDismissed = (): boolean => {
  try {
    return localStorage.getItem(PUSH_HINT_DISMISSED_KEY) === '1';
  } catch {
    // Privater Modus kann localStorage sperren – dann eben pro Sitzung zeigen.
    return false;
  }
};

const rememberDismissal = (): void => {
  try {
    localStorage.setItem(PUSH_HINT_DISMISSED_KEY, '1');
  } catch {
    // Nicht kritisch: der Hinweis erscheint dann in der nächsten Sitzung erneut.
  }
};

const renderHint = (onOpenSettings: () => void, onDismiss: () => void) => (
  <div className="relative bg-white text-gray-900 rounded-lg shadow-lg p-4 max-w-sm">
    <button
      onClick={onDismiss}
      className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800 rounded transition cursor-pointer"
      aria-label="Hinweis nicht mehr anzeigen"
    >
      <XIcon size={16} />
    </button>
    <div className="pr-6">
      <div className="flex items-center gap-2 mb-1 font-medium">
        <BellIcon size={16} className="text-green-800 shrink-0" />
        Benachrichtigungen sind aus
      </div>
      <div className="mb-3 text-sm text-gray-600">
        Du erfährst dadurch nicht, wenn ein Eintrag freigegeben oder geändert wird.
      </div>
      <button
        onClick={onOpenSettings}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition shadow-sm cursor-pointer"
      >
        Einstellungen öffnen
      </button>
    </div>
  </div>
);

// Weist darauf hin, dass Push inaktiv ist – aber nur in der installierten PWA.
//
// Zwei Gründe für diese Grenze: Auf iOS ist Push ausschließlich in der
// Home-Screen-App verfügbar, ein Hinweis im Safari-Tab würde also in eine
// Einstellungsseite führen, die nur erklärt, dass es hier nicht geht. Und das
// Feature ist bewusst auf die installierte App zugeschnitten – wer im Browser-Tab
// arbeitet, soll nicht dorthin gedrängt werden. Über die Einstellungen bleibt
// das Aktivieren dort möglich, wo der Browser es hergibt (Desktop, Android).
//
// Der Status deckt die übrigen Ausschlussgründe ab: fehlende Unterstützung,
// kein Service Worker, in den Browser-Einstellungen blockiert.
export const usePushHint = (status: PushStatus) => {
  const navigate = useNavigate();
  const location = useLocation();
  const shown = useRef(false);
  const onSettingsPage = location.pathname === '/einstellungen';

  useEffect(() => {
    // Auf der Einstellungsseite steht der echte Toggle direkt daneben.
    if (status !== 'off' || onSettingsPage || shown.current || wasDismissed()) return;
    if (!isStandalonePwa()) return;

    const timeoutId = window.setTimeout(() => {
      shown.current = true;

      const close = () => toast.dismiss(TOAST_ID);
      const dismiss = () => {
        rememberDismissal();
        close();
      };

      toast.custom(
        () =>
          renderHint(() => {
            close();
            navigate('/einstellungen');
          }, dismiss),
        { duration: Infinity, id: TOAST_ID, dismissible: false }
      );
    }, PUSH_HINT_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [status, onSettingsPage, navigate]);

  // Sobald Push aktiv ist, ist ein noch offener Hinweis gegenstandslos.
  useEffect(() => {
    if (status === 'on') toast.dismiss(TOAST_ID);
  }, [status]);
};

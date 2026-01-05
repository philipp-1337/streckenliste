import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, ShareIcon, SquarePlusIcon, MoreHorizontal, XIcon } from 'lucide-react';
import { PWA_INSTALL_PROMPT_DELAY } from '@constants';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Hilfsfunktion zur Erkennung der iOS-Version
const getIosVersion = (): number | null => {
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

// Prüfe iOS beim ersten Laden
const checkIsIos = () => {
  const userAgent = window.navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(userAgent);
  const isStandalone = 'standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone;
  return isIosDevice && !isStandalone;
};

// Konstanten außerhalb der Komponente berechnen
const isIos = checkIsIos();
const iosVersion = getIosVersion();

// CustomToast-Komponente für iOS
const IosInstallToast = ({ onClose }: { onClose: () => void }) => {
  const isNewIos = iosVersion && iosVersion >= 18;

  return (
    <div className="relative bg-white text-gray-900 rounded-lg shadow-lg p-4 max-w-sm">
      <button
        onClick={onClose}
        className="absolute -top-3 -left-3 p-1 text-gray-400 hover:text-gray-600 rounded transition"
        aria-label="Schließen"
      >
        <XIcon size={16} />
      </button>
      <div className="text-center leading-relaxed pr-6">
        <div className="mb-2 font-medium">Um die App zu installieren:</div>
        {isNewIos ? (
          // iOS 18+ (inkl. iOS 26) - neuer, komplizierter Prozess
          <div>
            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full mx-1">
              <MoreHorizontal size={16} />
            </span>{' '}
            →{' '}
            <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 rounded mx-1">
              <ShareIcon size={16} />
            </span>{' '}
            →{' '}
            <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full mx-1">
              <MoreHorizontal size={16} />
            </span>{' '}
            "Mehr" →{' '}
            <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 rounded mx-1">
              <SquarePlusIcon size={16} />
            </span>{' '}
            "Zum Home-Bildschirm"
          </div>
        ) : (
          // iOS < 18 - alter, einfacherer Prozess
          <div>
            <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 rounded mx-1">
              <ShareIcon size={16} />
            </span>{' '}
            →{' '}
            <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 rounded mx-1">
              <SquarePlusIcon size={16} />
            </span>{' '}
            "Zum Home-Bildschirm"
          </div>
        )}
      </div>
    </div>
  );
};

// CustomToast-Komponente für Non-iOS
const NonIosInstallToast = ({
  onInstall,
  onLater,
}: {
  onInstall: () => void;
  onLater: () => void;
}) => {
  return (
    <div className="bg-white text-gray-900 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="text-center">
        <div className="mb-3 font-medium">Möchtest du die App installieren?</div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onLater}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition shadow-sm"
          >
            Später
          </button>
          <button
            onClick={onInstall}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition shadow-sm"
          >
            <DownloadIcon size={16} />
            Installieren
          </button>
        </div>
      </div>
    </div>
  );
};

export const usePwaPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const installToastShown = useRef(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      // Zeige Install-Prompt nach 5 Sekunden
      setTimeout(() => setShowInstallPrompt(true), PWA_INSTALL_PROMPT_DELAY);
    };

    // Zeige Install-Prompt nach 5 Sekunden auf iOS
    if (isIos) {
      setTimeout(() => setShowInstallPrompt(true), PWA_INSTALL_PROMPT_DELAY);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (showInstallPrompt && !installToastShown.current) {
      installToastShown.current = true;

      const handleClose = () => {
        installToastShown.current = false;
        setShowInstallPrompt(false);
        toast.dismiss('pwa-toast');
      };

      const handleInstall = () => {
        if (installPrompt) {
          installPrompt.prompt();
        }
        handleClose();
      };

      toast.custom(
        (_) =>
          isIos ? (
            <IosInstallToast onClose={handleClose} />
          ) : (
            <NonIosInstallToast onInstall={handleInstall} onLater={handleClose} />
          ),
        {
          duration: Infinity,
          id: 'pwa-toast',
          dismissible: isIos,
        }
      );
    } else if (!showInstallPrompt && installToastShown.current) {
      installToastShown.current = false;
      toast.dismiss('pwa-toast');
    }
  }, [showInstallPrompt, installPrompt]);
};

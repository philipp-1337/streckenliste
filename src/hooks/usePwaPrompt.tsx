import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, ShareIcon, SquarePlusIcon, MoreHorizontal } from 'lucide-react';

// Hilfsfunktion zur Erkennung der iOS-Version
const getIosVersion = (): number | null => {
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

export const usePwaPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [iosVersion, setIosVersion] = useState<number | null>(null);
  const installToastShown = useRef(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
      // Zeige Install-Prompt nach 5 Sekunden
      setTimeout(() => setShowInstallPrompt(true), 5000);
    };

    const userAgent = window.navigator.userAgent;
    const isIosDevice = /iPad|iPhone|iPod/.test(userAgent);
    const isStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone;
    const version = getIosVersion();

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
      setIosVersion(version);
      // Zeige Install-Prompt nach 5 Sekunden auch auf iOS
      setTimeout(() => setShowInstallPrompt(true), 5000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (showInstallPrompt && !installToastShown.current) {
      installToastShown.current = true;
      toast(
        isIos ? (
          iosVersion && iosVersion >= 18 ? (
            // iOS 18+ (inkl. iOS 26) - neuer, komplizierter Prozess
            <div className="text-center leading-relaxed">
              <div className="mb-2">Um die App zu installieren:</div>
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
            <div className="text-center leading-relaxed">
              <div className="mb-2">Um die App zu installieren:</div>
              <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-100 rounded mx-1">
                <ShareIcon size={16} />
              </span>{' '}
              →{' '}
              <span className="inline-flex items-center justify-center w-7 h-7 bg-green-100 rounded mx-1">
                <SquarePlusIcon size={16} />
              </span>{' '}
              "Zum Home-Bildschirm"
            </div>
          )
        ) : (
          <div className="text-center">
            <div className="mb-3">Möchtest du die App installieren?</div>
            <button
              onClick={() => {
                if (installPrompt) {
                  installPrompt.prompt();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm"
            >
              <DownloadIcon size={16} />
              Installieren
            </button>
          </div>
        ),
        {
          duration: Infinity,
          className: 'pwa-toast',
          id: 'pwa-toast',
          closeButton: true,
          onDismiss: () => {
            installToastShown.current = false;
            setShowInstallPrompt(false);
          },
        }
      );
    } else if (!showInstallPrompt && installToastShown.current) {
      installToastShown.current = false;
      toast.dismiss('pwa-toast');
    }
  }, [showInstallPrompt, isIos, iosVersion, installPrompt]);
};

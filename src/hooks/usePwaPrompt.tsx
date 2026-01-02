import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { DownloadIcon, ShareIcon, SquarePlusIcon } from 'lucide-react';

export const usePwaPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
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

    if (isIosDevice && !isStandalone) {
      setIsIos(true);
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
          <span>
            Um diese App zu installieren, tippe auf <ShareIcon size={18} style={{ verticalAlign: 'middle' }} /> und dann auf <SquarePlusIcon size={18} style={{ verticalAlign: 'middle' }} /> "Zum Home-Bildschirm".
          </span>
        ) : (
          <span style={{ display: 'block' }}>
            <span style={{ display: 'block', marginBottom: 8 }}>Möchtest du die App installieren?</span>
            <button
              onClick={() => {
                if (installPrompt) {
                  installPrompt.prompt();
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <DownloadIcon size={16} />Installieren
            </button>
          </span>
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
  }, [showInstallPrompt, isIos, installPrompt]);
};

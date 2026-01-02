import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCwIcon } from 'lucide-react';

export const usePwaUpdate = () => {
  const updateToastShown = useRef(false);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Prüfe alle 60 Sekunden auf Updates
      r && setInterval(() => {
        r.update();
      }, 60000);
    },
    onRegisterError(error: Error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh && !updateToastShown.current) {
      updateToastShown.current = true;
      toast(
        <div style={{ display: 'block' }}>
          <div style={{ display: 'block', marginBottom: 8 }}>Eine neue Version der App ist verfügbar!</div>
          <button
            type="button"
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateServiceWorker(true);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              updateServiceWorker(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition active:bg-green-800"
            style={{ 
              marginLeft: 12,
              WebkitTapHighlightColor: 'transparent',
              cursor: 'pointer',
              touchAction: 'manipulation',
              minHeight: '44px',
              minWidth: '44px',
              pointerEvents: 'auto',
              position: 'relative',
              zIndex: 9999,
            }}
          >
            <RefreshCwIcon size={16} /> Aktualisieren
          </button>
        </div>,
        {
          duration: Infinity,
          className: 'update-toast',
          dismissible: false,
          id: 'update-toast',
        }
      );
    } else if (!needRefresh && updateToastShown.current) {
      updateToastShown.current = false;
      toast.dismiss('update-toast');
    }
  }, [needRefresh, updateServiceWorker]);
};

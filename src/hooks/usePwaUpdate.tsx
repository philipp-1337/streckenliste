import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCwIcon } from 'lucide-react';
import { SW_UPDATE_CHECK_INTERVAL } from '@constants';

export const usePwaUpdate = () => {
  const updateToastShown = useRef(false);
  const updateIntervalId = useRef<number | undefined>(undefined);
  
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Prüfe alle 60 Sekunden auf Updates
      if (r) {
        // Cleanup existierendes Interval vor dem Erstellen eines neuen
        if (updateIntervalId.current !== undefined) {
          clearInterval(updateIntervalId.current);
        }
        updateIntervalId.current = window.setInterval(() => {
          r.update();
        }, SW_UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error: Error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    if (needRefresh && !updateToastShown.current) {
      updateToastShown.current = true;
      
      const handleUpdate = () => {
        toast.dismiss('update-toast');
        updateServiceWorker(true);
      };
      
      toast(
        <div className="block">
          <div className="block mb-2">Eine neue Version der App ist verfügbar!</div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleUpdate();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition active:bg-green-800 cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] pointer-events-auto relative z-[9999]"
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

  // Cleanup des Update-Intervals beim Unmount
  useEffect(() => {
    return () => {
      if (updateIntervalId.current !== undefined) {
        clearInterval(updateIntervalId.current);
      }
    };
  }, []);
};

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  canOfferPushActivation,
  detectPushPlatform,
  getCurrentPushToken,
  isPushSupported,
  isStandalonePwa,
  requestPushPermission,
  waitForServiceWorkerReady,
} from '@/lib/messaging';
import {
  deactivatePushForThisDevice,
  getPushDeviceStatus,
  registerPushDevice,
} from '@/lib/pushClient';
import useAuth from '@hooks/useAuth';
import type { PushLevel } from '@types';

export type PushStatus =
  | 'loading'
  | 'unsupported'
  | 'needs-install'
  | 'no-serviceworker'
  | 'blocked'
  | 'off'
  | 'on';

const DEFAULT_LEVEL: PushLevel = 'status';

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [determinedStatus, setStatus] = useState<PushStatus>('loading');
  const [isBusy, setIsBusy] = useState(false);

  const level = currentUser?.pushLevel ?? DEFAULT_LEVEL;
  const uid = currentUser?.uid;

  // Abgeleitet statt im Effect gesetzt: ohne Anmeldung gilt der zuletzt
  // ermittelte Wert nicht mehr, und ein setState im Effect-Körper löst
  // Kaskaden-Renders aus.
  const status: PushStatus = uid ? determinedStatus : 'loading';

  useEffect(() => {
    // Ohne Anmeldung nicht ermitteln: getPushDeviceStatus ist ein Callable und
    // würde ohne Konto zwangsläufig scheitern. Abhängigkeit ist die uid, nicht
    // das Nutzerobjekt – das wird bei jedem Firestore-Snapshot neu erzeugt und
    // würde die Ermittlung sonst wiederholt anstoßen.
    if (!uid) return;

    let cancelled = false;

    const determineStatus = async () => {
      const supported = await isPushSupported();
      if (cancelled) return;

      if (!supported) {
        setStatus('unsupported');
        return;
      }
      // iOS gives the Push API only to installed home-screen apps.
      if (detectPushPlatform() === 'ios' && !isStandalonePwa()) {
        setStatus('needs-install');
        return;
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setStatus('blocked');
        return;
      }
      if (!canOfferPushActivation(supported)) {
        setStatus('unsupported');
        return;
      }

      // An active service worker is a hard requirement for registering a token.
      // Without this gate a failed SW check looks like "not registered yet, but
      // activatable" and the toggle would be offered even though activating it
      // is guaranteed to fail — e.g. on the plain Vite dev server, which never
      // builds a service worker at all.
      const registration = await waitForServiceWorkerReady();
      if (cancelled) return;
      if (!registration) {
        setStatus('no-serviceworker');
        return;
      }

      // Notification.permission stays "granted" forever and can never be reset
      // programmatically, so it cannot answer "is this device registered".
      // Only the backend knows.
      const token = await getCurrentPushToken();
      if (cancelled) return;
      if (!token) {
        setStatus('off');
        return;
      }

      try {
        const registered = await getPushDeviceStatus(token);
        if (!cancelled) setStatus(registered ? 'on' : 'off');
      } catch {
        if (!cancelled) setStatus('off');
      }
    };

    void determineStatus();
    return () => { cancelled = true; };
  }, [uid]);

  const toggle = useCallback(async () => {
    setIsBusy(true);
    try {
      if (status === 'on') {
        await deactivatePushForThisDevice();
        setStatus('off');
        toast.success('Benachrichtigungen deaktiviert');
        return;
      }

      const token = await requestPushPermission();
      if (!token) {
        toast.error('Benachrichtigungen konnten nicht aktiviert werden.');
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          setStatus('blocked');
        }
        return;
      }

      await registerPushDevice(token, detectPushPlatform());
      setStatus('on');
      toast.success('Benachrichtigungen aktiviert');
    } catch (error) {
      console.error('Push toggle failed:', error);
      toast.error('Benachrichtigungen konnten nicht geändert werden.');
    } finally {
      setIsBusy(false);
    }
  }, [status]);

  const changeLevel = useCallback(async (next: PushLevel) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { pushLevel: next });
    } catch (error) {
      console.error('Failed to save push level:', error);
      toast.error('Einstellung konnte nicht gespeichert werden.');
    }
  }, [currentUser]);

  return { status, level, isBusy, toggle, changeLevel };
};

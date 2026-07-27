import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { getCurrentPushToken, unregisterPushToken, type PushPlatform } from './messaging';

const callRegister = httpsCallable<{ token: string; platform: PushPlatform }, { success: boolean }>(
  functions,
  'registerPushDevice',
);

const callUnregister = httpsCallable<{ token?: string }, { success: boolean; removed: number }>(
  functions,
  'unregisterPushDevice',
);

const callStatus = httpsCallable<{ token: string }, { registered: boolean }>(
  functions,
  'getPushDeviceStatus',
);

export async function registerPushDevice(token: string, platform: PushPlatform): Promise<void> {
  await callRegister({ token, platform });
}

// Without a token the server deletes every device of the caller. That path
// matters when Safari already revoked the subscription and the client cannot
// produce a token any more — otherwise the row would linger forever.
export async function unregisterPushDevice(token?: string): Promise<void> {
  await callUnregister(token ? { token } : {});
}

export async function getPushDeviceStatus(token: string): Promise<boolean> {
  const result = await callStatus({ token });
  return result.data.registered === true;
}

// Löst die Zuordnung dieses Geräts zum aktuell angemeldeten Konto vollständig:
// serverseitiger Eintrag weg, FCM-Token verworfen. Wird vom Einstellungs-Toggle
// und vom Logout genutzt.
//
// Muss beim Logout vor signOut() laufen, weil der Callable ein angemeldetes
// Konto braucht. Ohne diesen Schritt bliebe die Zuordnung Token → Konto
// bestehen und ein geteiltes Gerät bekäme weiter die Benachrichtigungen des
// abgemeldeten Kontos auf den Lockscreen.
export async function deactivatePushForThisDevice(): Promise<void> {
  const token = await getCurrentPushToken();
  await unregisterPushDevice(token ?? undefined);
  await unregisterPushToken();
}

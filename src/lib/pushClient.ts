import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { PushPlatform } from './messaging';

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

import { BellIcon } from 'lucide-react';
import { usePushNotifications } from '@hooks/usePushNotifications';
import type { PushLevel } from '@types';

const LEVEL_OPTIONS: Array<{ value: PushLevel; label: string; hint: string }> = [
  { value: 'wichtig', label: 'Nur Wichtiges', hint: 'Nur wenn etwas zu tun ist' },
  { value: 'status', label: 'Statusänderungen', hint: 'Freigabe, Ablehnung, neue Einträge' },
  { value: 'alle', label: 'Alle Änderungen', hint: 'Zusätzlich Bearbeitungen und Löschungen' },
];

export const PushSettings = () => {
  const { status, level, isBusy, toggle, changeLevel } = usePushNotifications();

  if (status === 'loading') {
    return <p className="text-sm text-green-900/60">Benachrichtigungen werden geprüft …</p>;
  }

  if (status === 'unsupported') {
    return (
      <p className="text-sm text-green-900/60">
        Dieser Browser unterstützt keine Push-Benachrichtigungen.
      </p>
    );
  }

  if (status === 'needs-install') {
    return (
      <p className="text-sm text-green-900/60">
        Auf dem iPhone sind Benachrichtigungen nur möglich, wenn die App über „Zum Home-Bildschirm"
        installiert und von dort gestartet wird.
      </p>
    );
  }

  if (status === 'no-serviceworker') {
    return (
      <p className="text-sm text-green-900/60">
        Benachrichtigungen sind hier nicht verfügbar, weil kein Service Worker aktiv ist. Im
        Entwicklungsserver ist das normal — sie funktionieren nur in der gebauten App.
      </p>
    );
  }

  if (status === 'blocked') {
    return (
      <p className="text-sm text-green-900/60">
        Benachrichtigungen sind für diese Seite in den Browser-Einstellungen blockiert. Sie lassen
        sich nur dort wieder freigeben.
      </p>
    );
  }

  const isOn = status === 'on';

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={isBusy}
        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-green-900/10 cursor-pointer disabled:opacity-50 text-left"
      >
        <span className="flex items-center gap-3">
          <BellIcon size={20} strokeWidth={2} className="text-green-800 shrink-0" />
          <span className="flex flex-col">
            <span className="font-semibold text-green-900">Push-Benachrichtigungen</span>
            <span className="text-sm text-green-900/60">
              {isOn ? 'Auf diesem Gerät aktiv' : 'Auf diesem Gerät nicht aktiv'}
            </span>
          </span>
        </span>
        <span
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            isOn ? 'bg-green-700' : 'bg-green-900/20'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              isOn ? 'left-6' : 'left-1'
            }`}
          />
        </span>
      </button>

      {isOn && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-green-900 mb-1">Wann benachrichtigen?</legend>
          {LEVEL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 p-3 rounded-xl bg-white border border-green-900/10 cursor-pointer"
            >
              <input
                type="radio"
                name="pushLevel"
                value={option.value}
                checked={level === option.value}
                onChange={() => void changeLevel(option.value)}
                className="mt-1 accent-green-700"
              />
              <span className="flex flex-col">
                <span className="text-green-900">{option.label}</span>
                <span className="text-sm text-green-900/60">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
};

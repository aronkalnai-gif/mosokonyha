import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { Machine } from '../lib/machines';
import { syncMachineNotification } from '../lib/notifications';
import { MINUTE } from '../lib/time';

/** A running machine timer. Timers are personal and stored on the phone only. */
export type MachineTimer = { machineId: string; floor: number; startedAt: number; endsAt: number };

type Timers = {
  timers: Record<string, MachineTimer>;
  start: (machine: Machine, floor: number, label: string, minutes: number) => void;
  extend: (machine: Machine, floor: number, label: string, minutes: number) => void;
  stop: (machine: Machine, floor: number, label: string) => void;
  /** Stops every timer (e.g. after returning the key). */
  clear: () => void;
};

const STORAGE_KEY = 'machineTimers';
const TimersContext = createContext<Timers | null>(null);

const notifTarget = (m: Machine, floor: number, label: string) => ({
  id: m.id,
  index: floor * 10 + (m.kind === 'dryer' ? 9 : m.number),
  label,
  floor,
});

export function TimersProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [timers, setTimers] = useState<Record<string, MachineTimer>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setTimers(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((next: Record<string, MachineTimer>) => {
    setTimers(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const start: Timers['start'] = useCallback(
    (machine, floor, label, minutes) => {
      const now = Date.now();
      const timer = { machineId: machine.id, floor, startedAt: now, endsAt: now + minutes * MINUTE };
      persist({ ...timers, [machine.id]: timer });
      syncMachineNotification(t, notifTarget(machine, floor, label), new Date(timer.endsAt));
    },
    [timers, persist, t],
  );

  const extend: Timers['extend'] = useCallback(
    (machine, floor, label, minutes) => {
      const cur = timers[machine.id];
      if (!cur) return;
      const timer = { ...cur, endsAt: Math.max(cur.endsAt, Date.now()) + minutes * MINUTE };
      persist({ ...timers, [machine.id]: timer });
      syncMachineNotification(t, notifTarget(machine, floor, label), new Date(timer.endsAt));
    },
    [timers, persist, t],
  );

  const stop: Timers['stop'] = useCallback(
    (machine, floor, label) => {
      const { [machine.id]: _removed, ...rest } = timers;
      persist(rest);
      syncMachineNotification(t, notifTarget(machine, floor, label), null);
    },
    [timers, persist, t],
  );

  const clear = useCallback(() => {
    for (const timer of Object.values(timers)) {
      const [floorStr, rest] = timer.machineId.split('-');
      const kind = rest.startsWith('d') ? 'dryer' : 'washer';
      const machine: Machine = { id: timer.machineId, kind, number: Number(rest.slice(1)) };
      syncMachineNotification(t, notifTarget(machine, Number(floorStr), ''), null);
    }
    persist({});
  }, [timers, persist, t]);

  return <TimersContext.Provider value={{ timers, start, extend, stop, clear }}>{children}</TimersContext.Provider>;
}

export function useTimers(): Timers {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers outside TimersProvider');
  return ctx;
}

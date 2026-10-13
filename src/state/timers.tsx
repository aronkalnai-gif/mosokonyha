import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Machine } from '../lib/machines';
import { errorCode, supabase } from '../lib/supabase';
import { MINUTE } from '../lib/time';
import { useAuth } from './auth';
import { ServerError, useLaundry } from './laundry';

/**
 * A running machine timer. Stored on the server so it can send the
 * "finished" notification even when the page is closed.
 */
export type MachineTimer = { machineId: string; startedAt: number; endsAt: number };

type Timers = {
  timers: Record<string, MachineTimer>;
  start: (machine: Machine, minutes: number) => Promise<void>;
  extend: (machine: Machine, minutes: number) => Promise<void>;
  stop: (machine: Machine) => Promise<void>;
};

type Row = { machine_id: string; started_at: string; ends_at: string };
const fromRow = (r: Row): MachineTimer => ({
  machineId: r.machine_id,
  startedAt: new Date(r.started_at).getTime(),
  endsAt: new Date(r.ends_at).getTime(),
});

const TimersContext = createContext<Timers | null>(null);

export function TimersProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { myFloor } = useLaundry();
  const userId = session?.user.id;
  const [timers, setTimers] = useState<Record<string, MachineTimer>>({});

  // Reload when the key changes: returning it clears the timers on the server.
  const checkoutId = myFloor?.checkout_id;
  useEffect(() => {
    if (!userId) return setTimers({});
    supabase
      .from('machine_timers')
      .select('machine_id, started_at, ends_at')
      .then(({ data }) => setTimers(Object.fromEntries((data ?? []).map((r: Row) => [r.machine_id, fromRow(r)]))));
  }, [userId, checkoutId]);

  const write = useCallback(
    async (machine: Machine, startedAt: number, endsAt: number) => {
      const { data, error } = await supabase
        .from('machine_timers')
        .upsert({
          user_id: userId,
          machine_id: machine.id,
          started_at: new Date(startedAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
        })
        .select('machine_id, started_at, ends_at')
        .single();
      if (error) throw new ServerError(errorCode(error));
      setTimers((prev) => ({ ...prev, [machine.id]: fromRow(data) }));
    },
    [userId],
  );

  const start = useCallback<Timers['start']>(
    (machine, minutes) => {
      const now = Date.now();
      return write(machine, now, now + minutes * MINUTE);
    },
    [write],
  );

  const extend = useCallback<Timers['extend']>(
    async (machine, minutes) => {
      const cur = timers[machine.id];
      if (cur) await write(machine, cur.startedAt, Math.max(cur.endsAt, Date.now()) + minutes * MINUTE);
    },
    [timers, write],
  );

  const stop = useCallback<Timers['stop']>(async (machine) => {
    const { error } = await supabase.from('machine_timers').delete().eq('machine_id', machine.id);
    if (error) throw new ServerError(errorCode(error));
    setTimers(({ [machine.id]: _removed, ...rest }) => rest);
  }, []);

  return <TimersContext.Provider value={{ timers, start, extend, stop }}>{children}</TimersContext.Provider>;
}

export function useTimers(): Timers {
  const ctx = useContext(TimersContext);
  if (!ctx) throw new Error('useTimers outside TimersProvider');
  return ctx;
}

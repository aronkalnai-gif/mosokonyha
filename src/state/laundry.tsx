import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  Checkout,
  DEFAULT_SETTINGS,
  FloorStatus,
  Settings,
  errorCode,
  supabase,
} from '../lib/supabase';
import { useAuth } from './auth';
import { ServerError } from './errors';

export { ServerError };

type Laundry = {
  floors: FloorStatus[];
  settings: Settings;
  loaded: boolean;
  /** The floor whose key the current user holds. */
  myFloor: FloorStatus | undefined;
  watches: Set<number>;
  refresh: () => Promise<void>;
  pickUp: (floor: number, code: string) => Promise<Checkout>;
  returnKey: (code: string) => Promise<Checkout>;
  forceReturn: (floor: number) => Promise<void>;
  toggleWatch: (floor: number) => Promise<void>;
};

const LaundryContext = createContext<Laundry | null>(null);

async function rpc<R>(fn: string, args: Record<string, unknown>): Promise<R> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new ServerError(errorCode(error));
  return data as R;
}

export function LaundryProvider({ children }: { children: ReactNode }) {
  const { session, registered } = useAuth();
  const userId = session?.user.id;
  const [floors, setFloors] = useState<FloorStatus[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [watches, setWatches] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [f, s, w] = await Promise.all([
      supabase.from('floor_status').select('*').order('floor'),
      supabase.from('app_settings').select('key_minutes, fee_huf, fee_block_minutes, grace_minutes').single(),
      supabase.from('free_watchers').select('floor'),
    ]);
    if (f.data) setFloors(f.data);
    if (s.data) setSettings(s.data);
    if (w.data) setWatches(new Set(w.data.map((r) => r.floor)));
    if (f.data) setLoaded(true);
  }, []);

  useEffect(() => {
    // Only registered users may see the keys.
    if (!userId || !registered) return;
    refresh();

    // Live updates whenever any key is picked up or returned.
    const channel = supabase
      .channel('floor_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'floor_status' }, (payload) => {
        const row = payload.new as FloorStatus;
        if (!row?.floor) return;
        setFloors((prev) => prev.map((f) => (f.floor === row.floor ? row : f)));
        // Watches are removed server-side when a key frees up or you take it.
        if (!row.holder_id || row.holder_id === userId) {
          setWatches((prev) => {
            if (!prev.has(row.floor)) return prev;
            const next = new Set(prev);
            next.delete(row.floor);
            return next;
          });
        }
      })
      .subscribe();

    // Catch up on anything missed while in the background.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, registered, refresh]);

  const myFloor = useMemo(() => floors.find((f) => f.holder_id && f.holder_id === userId), [floors, userId]);

  const pickUp = useCallback(
    async (floor: number, code: string) => {
      const row = await rpc<Checkout>('checkout_key', { p_floor: floor, p_code: code });
      await refresh();
      return row;
    },
    [refresh],
  );

  const returnKey = useCallback(
    async (code: string) => {
      const row = await rpc<Checkout>('return_key', { p_code: code });
      await refresh();
      return row;
    },
    [refresh],
  );

  const forceReturn = useCallback(
    async (floor: number) => {
      await rpc('admin_force_return', { p_floor: floor });
      await refresh();
    },
    [refresh],
  );

  const toggleWatch = useCallback(
    async (floor: number) => {
      const on = watches.has(floor);
      const { error } = on
        ? await supabase.from('free_watchers').delete().eq('floor', floor)
        : await supabase.from('free_watchers').insert({ floor });
      if (error) throw new ServerError(errorCode(error));
      setWatches((prev) => {
        const next = new Set(prev);
        if (on) next.delete(floor);
        else next.add(floor);
        return next;
      });
    },
    [watches],
  );

  return (
    <LaundryContext.Provider
      value={{ floors, settings, loaded, myFloor, watches, refresh, pickUp, returnKey, forceReturn, toggleWatch }}
    >
      {children}
    </LaundryContext.Provider>
  );
}

export function useLaundry(): Laundry {
  const ctx = useContext(LaundryContext);
  if (!ctx) throw new Error('useLaundry outside LaundryProvider');
  return ctx;
}

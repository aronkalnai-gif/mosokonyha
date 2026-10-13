import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

type BoardRow = { floor: number; taken: boolean; picked_up_at: string | null };

/** The public board has no names; shape it like a floor_status row. */
const fromBoard = (r: BoardRow): FloorStatus => ({
  floor: r.floor,
  holder_id: r.taken ? 'someone' : null,
  holder_name: null,
  holder_room: null,
  picked_up_at: r.picked_up_at,
  checkout_id: null,
});

export function LaundryProvider({ children }: { children: ReactNode }) {
  const { session, registered, ensureSession } = useAuth();
  const userId = session?.user.id;
  const [floors, setFloors] = useState<FloorStatus[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [watches, setWatches] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Everyone sees the public board; people who have picked up a key before
  // (registered) see who holds which key.
  const table = registered ? 'floor_status' : 'floor_board';
  // Read at call time: a refresh started just before joining must not load the
  // name-less board after the full list.
  const tableRef = useRef(table);
  tableRef.current = table;

  const refresh = useCallback(async () => {
    const table = tableRef.current;
    const [f, s, w] = await Promise.all([
      supabase.from(table).select('*').order('floor'),
      supabase.from('app_settings').select('key_minutes, fee_huf, fee_block_minutes, grace_minutes').single(),
      userId ? supabase.from('free_watchers').select('floor') : Promise.resolve({ data: [] as { floor: number }[] }),
    ]);
    if (f.data && table === tableRef.current) {
      setFloors(table === 'floor_board' ? (f.data as BoardRow[]).map(fromBoard) : f.data);
      setLoaded(true);
    }
    if (s.data) setSettings(s.data);
    if (w.data) setWatches(new Set(w.data.map((r: { floor: number }) => r.floor)));
  }, [table, userId]); // eslint-disable-line react-hooks/exhaustive-deps -- table: reload when it changes

  useEffect(() => {
    refresh();

    // Live updates whenever any key is picked up or returned.
    const channel = supabase
      .channel(table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (!(payload.new as { floor?: number })?.floor) return;
        const row = table === 'floor_board' ? fromBoard(payload.new as BoardRow) : (payload.new as FloorStatus);
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
  }, [table, userId, refresh]);

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
      await ensureSession();
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
    [watches, ensureSession],
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

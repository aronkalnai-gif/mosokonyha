import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY – copy .env.example to .env');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh the session while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export type FloorStatus = {
  floor: number;
  holder_id: string | null;
  holder_name: string | null;
  holder_room: string | null;
  picked_up_at: string | null;
  checkout_id: number | null;
};

export type Checkout = {
  id: number;
  floor: number;
  user_id: string;
  picked_up_at: string;
  returned_at: string | null;
  overtime_minutes: number | null;
  fee_huf: number | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  room: string | null;
  favorite_floor: number | null;
  registered_at: string | null;
  lang: 'hu' | 'en';
  is_admin: boolean;
};

export type Settings = {
  key_minutes: number;
  fee_huf: number;
  fee_block_minutes: number;
  grace_minutes: number;
};

export const DEFAULT_SETTINGS: Settings = {
  key_minutes: 240,
  fee_huf: 500,
  fee_block_minutes: 30,
  grace_minutes: 0,
};

/** Turns a Postgres "raise exception 'code'" from our RPCs into its code. */
export function errorCode(error: { message?: string } | null | undefined): string {
  return error?.message?.trim() || 'unknown';
}

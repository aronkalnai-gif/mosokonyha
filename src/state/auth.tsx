import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { forgetThisBrowser, resyncPush } from '../lib/push';
import { errorCode, Profile, supabase } from '../lib/supabase';
import { ServerError } from './errors';

// Logging in is optional. Anyone can look at the keys. When someone first
// needs an account (to pick up a key, or to be notified), the page signs in
// anonymously (the session is kept in the browser). Picking up a key also
// needs a name and room number, given once (public.register). An e-mail and
// password account keeps the name, room and favourite floor across devices.
type Auth = {
  session: Session | null;
  profile: Profile | null;
  registered: boolean;
  /** Has an e-mail/password account (not just this browser's anonymous one). */
  loggedIn: boolean;
  email: string | null;
  /** True until we know whether there is a session (and its profile). */
  loading: boolean;
  join: (name: string, room: string, code: string) => Promise<void>;
  /** Signs in anonymously if needed (e.g. to save notification settings). */
  ensureSession: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'room' | 'favorite_floor' | 'lang'>>) => Promise<void>;
  createAccount: (email: string, password: string, name: string, room: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  /** Forgets this browser's identity; joining again needs the QR code. */
  leave: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    setProfile(null);
    setProfileLoaded(false);
    if (!userId) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) console.warn('Profile load failed', error);
        // join() may already have stored a newer (registered) profile.
        setProfile((prev) => prev ?? data);
        setProfileLoaded(true);
      });
    resyncPush().catch((e) => console.warn('Push', e));
  }, [userId]);

  const ensureSession = useCallback(async () => {
    if (session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new ServerError(error.message);
  }, [session]);

  const join = useCallback<Auth['join']>(
    async (name, room, code) => {
      await ensureSession();
      const { data, error } = await supabase.rpc('register', { p_name: name, p_room: room, p_code: code });
      if (error) throw new ServerError(errorCode(error));
      setProfile(data);
      setProfileLoaded(true);
    },
    [ensureSession],
  );

  const updateProfile = useCallback<Auth['updateProfile']>(async (patch) => {
    // Read the id at call time: the session may have been created just now.
    const id = (await supabase.auth.getSession()).data.session?.user.id;
    if (!id) return;
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
    if (error) throw error;
    setProfile(data);
  }, []);

  const createAccount = useCallback<Auth['createAccount']>(
    async (email, password, name, room) => {
      let id: string;
      if (session?.user.is_anonymous) {
        // Turn this browser's anonymous identity into a real account, so
        // everything it has (a key, timers, registration) stays.
        const { data, error } = await supabase.auth.updateUser({ email, password });
        if (error) throw new ServerError(authErrorCode(error));
        id = data.user.id;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw new ServerError(authErrorCode(error));
        if (!data.session || !data.user) throw new ServerError('confirm_email');
        id = data.user.id;
      }
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: name, room })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new ServerError(errorCode(error));
      setProfile(data);
      setProfileLoaded(true);
    },
    [session],
  );

  const logIn = useCallback<Auth['logIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new ServerError(authErrorCode(error));
  }, []);

  const leave = useCallback(async () => {
    await forgetThisBrowser().catch((e) => console.warn('Push', e));
    await supabase.auth.signOut();
  }, []);

  const loading = !sessionLoaded || (!!session && !profileLoaded);
  const registered = !!profile?.registered_at;
  const loggedIn = !!session && !session.user.is_anonymous;
  const email = loggedIn ? (session.user.email ?? null) : null;
  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        registered,
        loggedIn,
        email,
        loading,
        join,
        ensureSession,
        updateProfile,
        createAccount,
        logIn,
        leave,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

/** Supabase Auth errors → our error codes (see err_* in i18n). */
function authErrorCode(error: { code?: string; message?: string }): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'invalid_login';
    case 'user_already_exists':
    case 'email_exists':
      return 'email_taken';
    case 'weak_password':
      return 'weak_password';
    case 'email_not_confirmed':
      return 'confirm_email';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'invalid_email';
    default:
      return error.message ?? 'unknown';
  }
}

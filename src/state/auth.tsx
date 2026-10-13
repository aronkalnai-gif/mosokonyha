import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { forgetThisBrowser, resyncPush } from '../lib/push';
import { errorCode, Profile, supabase } from '../lib/supabase';
import { ServerError } from './errors';

// There is no login. The page signs in anonymously (the session is kept in
// the browser), and the user registers once with a name and the code from the
// reception QR code.
type Auth = {
  session: Session | null;
  profile: Profile | null;
  registered: boolean;
  /** True until we know whether there is a session (and its profile). */
  loading: boolean;
  join: (name: string, code: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'lang'>>) => Promise<void>;
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

  const join = useCallback<Auth['join']>(
    async (name, code) => {
      if (!session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw new ServerError(error.message);
      }
      const { data, error } = await supabase.rpc('register', { p_name: name, p_code: code });
      if (error) throw new ServerError(errorCode(error));
      setProfile(data);
      setProfileLoaded(true);
    },
    [session],
  );

  const updateProfile = useCallback<Auth['updateProfile']>(
    async (patch) => {
      if (!userId) return;
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
      if (error) throw error;
      setProfile(data);
    },
    [userId],
  );

  const leave = useCallback(async () => {
    await forgetThisBrowser().catch((e) => console.warn('Push', e));
    await supabase.auth.signOut();
  }, []);

  const loading = !sessionLoaded || (!!session && !profileLoaded);
  const registered = !!profile?.registered_at;
  return (
    <AuthContext.Provider value={{ session, profile, registered, loading, join, updateProfile, leave }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

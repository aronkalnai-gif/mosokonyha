import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { forgetThisBrowser, resyncPush } from '../lib/push';
import { Profile, supabase } from '../lib/supabase';

type Auth = {
  session: Session | null;
  profile: Profile | null;
  /** True until we know whether there is a session (and its profile). */
  loading: boolean;
  updateProfile: (patch: Partial<Pick<Profile, 'display_name' | 'lang'>>) => Promise<void>;
  signOut: () => Promise<void>;
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
        setProfile(data);
        setProfileLoaded(true);
      });
    resyncPush().catch((e) => console.warn('Push', e));
  }, [userId]);

  const updateProfile = useCallback<Auth['updateProfile']>(
    async (patch) => {
      if (!userId) return;
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
      if (error) throw error;
      setProfile(data);
    },
    [userId],
  );

  const signOut = useCallback(async () => {
    await forgetThisBrowser().catch((e) => console.warn('Push', e));
    await supabase.auth.signOut();
  }, [userId]);

  const loading = !sessionLoaded || (!!session && !profileLoaded);
  return (
    <AuthContext.Provider value={{ session, profile, loading, updateProfile, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

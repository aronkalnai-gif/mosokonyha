import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider, useI18n } from '../lib/i18n';
import { getPushToken, requestPermission, setupChannels } from '../lib/notifications';
import { colors } from '../lib/theme';
import { AuthProvider, useAuth } from '../state/auth';
import { LaundryProvider } from '../state/laundry';
import { TimersProvider } from '../state/timers';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <LaundryProvider>
            <TimersProvider>
              <StatusBar style="dark" />
              <Routes />
            </TimersProvider>
          </LaundryProvider>
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function Routes() {
  const { session, profile, loading, updateProfile } = useAuth();
  const { t, lang } = useI18n();

  useEffect(() => {
    setupChannels(t);
  }, [t]);

  // After signing in: ask for notification permission and register for push.
  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    (async () => {
      await requestPermission();
      const token = await getPushToken();
      if (token && token !== profile?.push_token) await updateProfile({ push_token: token });
    })().catch((e) => console.warn('Push registration', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Keep the account's language in sync, so push messages arrive in it.
  useEffect(() => {
    if (profile && profile.lang !== lang) updateProfile({ lang }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, profileId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const signedIn = !!session && !!profile;
  const named = signedIn && !!profile.display_name;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !named}>
        <Stack.Screen name="name" options={{ title: t('nameTitle') }} />
      </Stack.Protected>
      <Stack.Protected guard={named}>
        <Stack.Screen name="index" options={{ title: t('appName') }} />
        <Stack.Screen name="scan" options={{ title: '' }} />
        <Stack.Screen name="room" options={{ title: '' }} />
        <Stack.Screen name="proof" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ title: t('settings') }} />
      </Stack.Protected>
    </Stack>
  );
}

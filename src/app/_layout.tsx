import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogProvider } from '../components/Dialog';
import { I18nProvider, useI18n } from '../lib/i18n';
import { hasPendingQr, rememberQrFromUrl } from '../lib/pendingQr';
import { registerServiceWorker } from '../lib/push';
import { colors, font } from '../lib/theme';
import { AuthProvider, useAuth } from '../state/auth';
import { LaundryProvider } from '../state/laundry';
import { TimersProvider } from '../state/timers';

rememberQrFromUrl();

// Pages opened from a link (like the reception QR code) still get the key
// list behind them, so "back" leads somewhere.
export const unstable_settings = { initialRouteName: 'index' };

export default function RootLayout() {
  useEffect(registerServiceWorker, []);
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <DialogProvider>
          <AuthProvider>
            <LaundryProvider>
              <TimersProvider>
                <StatusBar style="dark" />
                <Routes />
              </TimersProvider>
            </LaundryProvider>
          </AuthProvider>
        </DialogProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}

function Routes() {
  const { profile, registered, loading, updateProfile } = useAuth();
  const { t, lang } = useI18n();
  const pathname = usePathname();

  // Keep the account's language in sync, so notifications arrive in it.
  const profileId = profile?.id;
  useEffect(() => {
    if (profile && profile.lang !== lang) updateProfile({ lang }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, profileId]);

  // Just joined at the reception (or opened its QR link): continue to the
  // reception page to pick up or return a key.
  useEffect(() => {
    if (registered && pathname !== '/qr' && hasPendingQr()) router.replace('/qr');
  }, [registered, pathname]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={({ navigation }) => ({
        // Pages opened directly (e.g. from the QR link) get a way back to the list.
        headerLeft: navigation.canGoBack() || !registered ? undefined : () => <HomeLink label={t('keys')} />,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: font.medium, fontSize: 16 },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      })}
    >
      <Stack.Protected guard={!registered}>
        <Stack.Screen name="welcome" options={{ headerShown: false, title: t('appName') }} />
        <Stack.Screen name="join" options={{ title: t('nameTitle') }} />
      </Stack.Protected>
      <Stack.Protected guard={registered}>
        <Stack.Screen name="index" options={{ title: t('appName') }} />
        <Stack.Screen name="qr" options={{ title: '' }} />
        <Stack.Screen name="room" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: '' }} />
      </Stack.Protected>
      <Stack.Screen name="scan" options={{ title: '' }} />
    </Stack>
  );
}

function HomeLink({ label }: { label: string }) {
  return (
    <Pressable onPress={() => router.replace('/')} hitSlop={10} style={{ paddingHorizontal: 4 }}>
      <Text style={{ fontSize: 15, color: colors.text }}>← {label}</Text>
    </Pressable>
  );
}

import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Muted, Title } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { hasPendingQr } from '../lib/pendingQr';
import { colors } from '../lib/theme';

/** First visit: you join by scanning the QR code at the reception. */
export default function Welcome() {
  const { t, lang, setLang } = useI18n();

  // Opened from the QR code link: go straight to entering a name.
  if (hasPendingQr()) return <Redirect href="/join" />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.logo}>🧺</Text>
        <Title style={styles.center}>{t('appName')}</Title>
        <Muted style={styles.center}>{t('welcomeIntro')}</Muted>
        <Button title={`📷 ${t('welcomeScan')}`} onPress={() => router.push({ pathname: '/scan', params: { mode: 'join' } })} />
        <Muted style={styles.center}>{t('welcomeCameraTip')}</Muted>

        <View style={styles.langRow}>
          <Button small variant={lang === 'hu' ? 'secondary' : 'ghost'} title="Magyar" onPress={() => setLang('hu')} />
          <Button small variant={lang === 'en' ? 'secondary' : 'ghost'} title="English" onPress={() => setLang('en')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  logo: { fontSize: 64, textAlign: 'center' },
  center: { textAlign: 'center' },
  langRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
});

import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MachineGlyph } from '../components/icons';
import { Button, Muted } from '../components/ui';
import { Lang, useI18n } from '../lib/i18n';
import { hasPendingQr } from '../lib/pendingQr';
import { colors, font } from '../lib/theme';

/** First visit: you join by scanning the QR code at the reception. */
export default function Welcome() {
  const { t, lang, setLang } = useI18n();

  // Opened from the QR code link: go straight to entering a name.
  if (hasPendingQr()) return <Redirect href="/join" />;

  const langLink = (l: Lang, label: string) => (
    <Pressable onPress={() => setLang(l)} hitSlop={8}>
      <Text style={[styles.lang, lang === l && styles.langOn]}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <MachineGlyph size={56} />
          <Text style={styles.title}>{t('appName')}</Text>
          <Muted style={styles.intro}>{t('welcomeIntro')}</Muted>
        </View>

        <View style={styles.bottom}>
          <Button title={t('welcomeScan')} onPress={() => router.push({ pathname: '/scan', params: { mode: 'join' } })} />
          <Muted style={styles.tip}>{t('welcomeCameraTip')}</Muted>
          <View style={styles.langRow}>
            {langLink('hu', 'Magyar')}
            <Text style={styles.lang}>·</Text>
            {langLink('en', 'English')}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 72, paddingBottom: 32 },
  top: { gap: 20 },
  title: { fontSize: 40, fontWeight: font.light, color: colors.text, letterSpacing: -1, marginTop: 12 },
  intro: { fontSize: 16, lineHeight: 24, maxWidth: 360 },
  bottom: { gap: 16 },
  tip: { fontSize: 13, textAlign: 'center' },
  langRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8 },
  lang: { fontSize: 13, color: colors.faint },
  langOn: { color: colors.text, fontWeight: font.medium },
});

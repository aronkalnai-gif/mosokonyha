import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Muted, Title } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/theme';

const ALLOWED = /^[^@\s]+@edu\.bme\.hu$/i;

export default function Login() {
  const { t, lang, setLang } = useI18n();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    const addr = email.trim().toLowerCase();
    if (!ALLOWED.test(addr)) return setError(t('onlyBme'));
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) {
      setError(error.message.includes('email_domain_not_allowed') ? errorText(t, 'email_domain_not_allowed') : t('loginFailed', { msg: error.message }));
    } else {
      setEmail(addr);
      setSent(true);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError(t('loginFailed', { msg: error.message }));
    // On success the auth listener switches to the next screen.
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="height" style={styles.wrap}>
        <Text style={styles.logo}>🧺</Text>
        <Title style={styles.center}>{t('appName')}</Title>
        <Muted style={styles.center}>{sent ? t('codeSentTo', { email }) : t('loginIntro')}</Muted>

        {!sent ? (
          <TextInput
            style={styles.input}
            placeholder={t('emailPlaceholder')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={sendCode}
          />
        ) : (
          <TextInput
            style={[styles.input, styles.code]}
            placeholder={t('codePlaceholder')}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={10}
            value={code}
            onChangeText={setCode}
            onSubmitEditing={verify}
          />
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {!sent ? (
          <Button title={t('sendCode')} onPress={sendCode} loading={busy} />
        ) : (
          <>
            <Button title={t('verify')} onPress={verify} loading={busy} disabled={code.trim().length < 6} />
            <Button title={t('otherEmail')} variant="ghost" onPress={() => { setSent(false); setCode(''); }} />
          </>
        )}

        <View style={styles.langRow}>
          <Button small variant={lang === 'hu' ? 'secondary' : 'ghost'} title="Magyar" onPress={() => setLang('hu')} />
          <Button small variant={lang === 'en' ? 'secondary' : 'ghost'} title="English" onPress={() => setLang('en')} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, justifyContent: 'center', padding: 24, gap: 14 },
  logo: { fontSize: 64, textAlign: 'center' },
  center: { textAlign: 'center' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  code: { letterSpacing: 6, textAlign: 'center', fontSize: 22 },
  error: { color: colors.danger, textAlign: 'center' },
  langRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
});

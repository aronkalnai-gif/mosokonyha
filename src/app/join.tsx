import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Muted } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { isValidSecret } from '../lib/machines';
import { peekPendingQr, takePendingQr } from '../lib/pendingQr';
import { colors } from '../lib/theme';
import { useAuth } from '../state/auth';
import { ServerError } from '../state/errors';

/** After scanning the reception QR code for the first time: enter your name. */
export default function Join() {
  const { t } = useI18n();
  const { join } = useAuth();
  const [code] = useState(peekPendingQr);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isValidSecret(code)) return <Redirect href="/welcome" />;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // The code stays stored: the reception page uses it next.
      await join(name.trim(), code);
    } catch (e) {
      const errCode = e instanceof ServerError ? e.code : String(e);
      if (errCode === 'invalid_qr') takePendingQr();
      setError(errorText(t, errCode));
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Muted>{t('nameIntro')}</Muted>
      <TextInput
        style={styles.input}
        placeholder={t('namePlaceholder')}
        autoCapitalize="words"
        autoComplete="name"
        autoFocus
        value={name}
        onChangeText={setName}
        onSubmitEditing={() => name.trim().length >= 2 && submit()}
        maxLength={60}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {error && !peekPendingQr() && (
        <Button variant="secondary" title={t('welcomeScan')} onPress={() => router.replace('/welcome')} />
      )}
      <Button title={t('joinButton')} onPress={submit} loading={busy} disabled={name.trim().length < 2} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 14 },
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
  error: { color: colors.danger },
});

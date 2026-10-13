import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Muted } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { isValidSecret, ROOM_PATTERN } from '../lib/machines';
import { peekPendingQr, takePendingQr } from '../lib/pendingQr';
import { colors, font } from '../lib/theme';
import { useAuth } from '../state/auth';
import { ServerError } from '../state/errors';

/** After scanning the reception QR code for the first time: name and room number. */
export default function Join() {
  const { t } = useI18n();
  const { join } = useAuth();
  const [code] = useState(peekPendingQr);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isValidSecret(code)) return <Redirect href="/welcome" />;

  const valid = name.trim().length >= 2 && ROOM_PATTERN.test(room.trim());

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      // The code stays stored: the reception page uses it next.
      await join(name.trim(), room.trim(), code);
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
      <View style={styles.row}>
        <View style={styles.nameCol}>
          <Text style={styles.label}>{t('displayName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('namePlaceholder')}
            autoCapitalize="words"
            autoComplete="name"
            autoFocus
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
        </View>
        <View style={styles.roomCol}>
          <Text style={styles.label}>{t('roomLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('roomPlaceholder')}
            autoCapitalize="characters"
            inputMode="numeric"
            value={room}
            onChangeText={setRoom}
            onSubmitEditing={submit}
            maxLength={10}
          />
        </View>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {error && !peekPendingQr() && (
        <Button variant="secondary" title={t('welcomeScan')} onPress={() => router.replace('/welcome')} />
      )}
      <Button title={t('joinButton')} onPress={submit} loading={busy} disabled={!valid} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 8, gap: 18 },
  row: { flexDirection: 'row', gap: 10 },
  nameCol: { flex: 1, gap: 6 },
  roomCol: { width: 110, gap: 6 },
  label: { fontSize: 11, fontWeight: font.semibold, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger },
});

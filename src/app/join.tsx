// Asked once, the first time someone picks up a key: name and room number.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Eyebrow, Muted } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { isValidSecret, ROOM_PATTERN } from '../lib/machines';
import { peekPendingQr, takePendingQr } from '../lib/pendingQr';
import { colors, font } from '../lib/theme';
import { useAfterKeyChange } from '../lib/useAfterKeyChange';
import { useAuth } from '../state/auth';
import { ServerError } from '../state/errors';
import { useLaundry } from '../state/laundry';

export default function Join() {
  const { t } = useI18n();
  const { join, registered } = useAuth();
  const { pickUp } = useLaundry();
  const afterKeyChange = useAfterKeyChange();
  const params = useLocalSearchParams<{ floor?: string }>();
  const floor = params.floor ? Number(params.floor) : null;
  // Coming from a floor's "pick up" button we take the key right after joining,
  // so the code is used here. From the reception link it stays stored for the
  // reception page.
  const [code] = useState(() => (floor ? takePendingQr() : peekPendingQr()));
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (registered && !busy) return <Redirect href="/" />;
  if (!isValidSecret(code)) return <Redirect href="/" />;

  const valid = name.trim().length >= 2 && ROOM_PATTERN.test(room.trim());

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await join(name.trim(), room.trim(), code);
      if (floor) afterKeyChange('pickup', await pickUp(floor, code));
    } catch (e) {
      const errCode = e instanceof ServerError ? e.code : String(e);
      if (errCode === 'invalid_qr') takePendingQr();
      setError(errorText(t, errCode));
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{floor ? t('joinTitleFloor', { floor }) : t('nameTitle')}</Text>
      <Muted>{t('nameIntro')}</Muted>
      <View style={styles.row}>
        <View style={styles.nameCol}>
          <Eyebrow>{t('displayName')}</Eyebrow>
          <TextInput
            style={styles.input}
            placeholder={t('namePlaceholder')}
            placeholderTextColor={colors.faint}
            autoCapitalize="words"
            autoComplete="name"
            autoFocus
            value={name}
            onChangeText={setName}
            maxLength={60}
          />
        </View>
        <View style={styles.roomCol}>
          <Eyebrow>{t('roomLabel')}</Eyebrow>
          <TextInput
            style={styles.input}
            placeholder={t('roomPlaceholder')}
            placeholderTextColor={colors.faint}
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
      <Button title={floor ? t('joinAndPickUp') : t('joinButton')} onPress={submit} loading={busy} disabled={!valid} />
      {error && <Button variant="ghost" title={t('back')} onPress={() => router.replace('/')} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 24, paddingTop: 4, gap: 18 },
  title: { fontSize: 30, fontWeight: font.light, color: colors.text, letterSpacing: -0.6 },
  row: { flexDirection: 'row', gap: 10 },
  nameCol: { flex: 1, gap: 8 },
  roomCol: { width: 110, gap: 8 },
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

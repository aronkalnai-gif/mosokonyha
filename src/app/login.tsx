// Optional account: log in on any device, or create an account so the name,
// room number and favourite floor are kept.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Eyebrow, Muted } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { ROOM_PATTERN } from '../lib/machines';
import { colors, font } from '../lib/theme';
import { useAuth } from '../state/auth';
import { ServerError } from '../state/errors';
import { useLaundry } from '../state/laundry';

type Mode = 'login' | 'signup';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function Login() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ mode?: Mode }>();
  const { loggedIn, profile, createAccount, logIn } = useAuth();
  const { myFloor } = useLaundry();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(profile?.display_name ?? '');
  const [room, setRoom] = useState(profile?.room ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loggedIn && !busy) return <Redirect href="/" />;

  // Logging in to another account would leave this browser's key behind.
  const holdingKey = !!myFloor;
  const valid =
    EMAIL.test(email.trim()) &&
    password.length >= 6 &&
    (mode === 'login' || (name.trim().length >= 2 && ROOM_PATTERN.test(room.trim())));

  const submit = async () => {
    if (!valid || (mode === 'login' && holdingKey)) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await logIn(email.trim(), password);
      else await createAccount(email.trim(), password, name.trim(), room.trim());
      router.dismissTo('/');
    } catch (e) {
      setError(errorText(t, e instanceof ServerError ? e.code : String(e)));
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{mode === 'login' ? t('loginTitle') : t('signupTitle')}</Text>
      <Muted>{t('accountIntro')}</Muted>

      <View style={styles.segment}>
        {(['login', 'signup'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => {
              setMode(m);
              setError(null);
            }}
            accessibilityRole="button"
            style={[styles.segmentItem, mode === m && styles.segmentOn]}
          >
            <Text style={[styles.segmentText, mode === m && styles.segmentTextOn]}>
              {m === 'login' ? t('loginTab') : t('signupTab')}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'signup' && (
        <View style={styles.row}>
          <View style={styles.nameCol}>
            <Eyebrow>{t('displayName')}</Eyebrow>
            <TextInput
              style={styles.input}
              placeholder={t('namePlaceholder')}
              placeholderTextColor={colors.faint}
              autoCapitalize="words"
              autoComplete="name"
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
              inputMode="numeric"
              value={room}
              onChangeText={setRoom}
              maxLength={10}
            />
          </View>
        </View>
      )}

      <View style={styles.field}>
        <Eyebrow>{t('emailLabel')}</Eyebrow>
        <TextInput
          style={styles.input}
          placeholder="nev@example.com"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChangeText={setEmail}
        />
      </View>
      <View style={styles.field}>
        <Eyebrow>{t('passwordLabel')}</Eyebrow>
        <TextInput
          style={styles.input}
          placeholder={t('passwordPlaceholder')}
          placeholderTextColor={colors.faint}
          secureTextEntry
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />
      </View>

      {mode === 'login' && holdingKey && <Text style={styles.warning}>{t('loginHoldingKey')}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={mode === 'login' ? t('loginButton') : t('signupButton')}
        onPress={submit}
        loading={busy}
        disabled={!valid || (mode === 'login' && holdingKey)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 48, gap: 18 },
  title: { fontSize: 30, fontWeight: font.light, color: colors.text, letterSpacing: -0.6 },
  segment: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 3 },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9 },
  segmentOn: { backgroundColor: colors.text },
  segmentText: { fontSize: 14, color: colors.text },
  segmentTextOn: { color: colors.primaryText },
  row: { flexDirection: 'row', gap: 10 },
  nameCol: { flex: 1, gap: 8 },
  roomCol: { width: 110, gap: 8 },
  field: { gap: 8 },
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
  warning: { color: colors.taken, lineHeight: 21 },
  error: { color: colors.danger, lineHeight: 21 },
});

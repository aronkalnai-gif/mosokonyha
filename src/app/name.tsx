import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Muted } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useAuth } from '../state/auth';

export default function Name() {
  const { t } = useI18n();
  const { updateProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ display_name: name.trim() });
    } catch (e) {
      setError(String((e as Error).message ?? e));
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
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        maxLength={60}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title={t('save')} onPress={save} loading={busy} disabled={name.trim().length < 2} />
      <Button title={t('signOut')} variant="ghost" onPress={signOut} />
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

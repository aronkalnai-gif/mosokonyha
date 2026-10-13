import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Muted } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { getPushToken, hasPermission, requestPermission } from '../lib/notifications';
import { colors } from '../lib/theme';
import { formatHuf } from '../lib/time';
import { useAuth } from '../state/auth';
import { useLaundry } from '../state/laundry';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { profile, updateProfile, signOut } = useAuth();
  const { settings } = useLaundry();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [notifOn, setNotifOn] = useState<boolean | null>(null);

  useEffect(() => {
    hasPermission().then(setNotifOn);
  }, []);

  const enableNotifications = async () => {
    const granted = await requestPermission();
    setNotifOn(granted);
    if (!granted) return Linking.openSettings();
    const token = await getPushToken();
    if (token) await updateProfile({ push_token: token });
  };

  const saveName = async () => {
    setSaving(true);
    await updateProfile({ display_name: name.trim() }).finally(() => setSaving(false));
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card style={styles.card}>
        <Text style={styles.label}>{t('displayName')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} />
        <Button
          small
          title={t('save')}
          onPress={saveName}
          loading={saving}
          disabled={name.trim().length < 2 || name.trim() === profile?.display_name}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.row}>
          <Button small style={styles.flex} variant={lang === 'hu' ? 'primary' : 'secondary'} title="Magyar" onPress={() => setLang('hu')} />
          <Button small style={styles.flex} variant={lang === 'en' ? 'primary' : 'secondary'} title="English" onPress={() => setLang('en')} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>{t('notifications')}</Text>
        <Button
          small
          variant={notifOn ? 'ghost' : 'secondary'}
          title={notifOn ? `✅ ${t('notificationsOn')}` : t('notificationsOff')}
          onPress={enableNotifications}
          disabled={notifOn === true}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>{t('rules')}</Text>
        <Muted>
          {t('rulesText', {
            hours: settings.key_minutes / 60,
            block: settings.fee_block_minutes,
            fee: formatHuf(settings.fee_huf),
          })}
        </Muted>
      </Card>

      <Muted style={styles.center}>{t('signedInAs', { email: profile?.email ?? '' })}</Muted>
      <Button variant="danger" title={t('signOut')} onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { gap: 10 },
  label: { fontWeight: '700', color: colors.text, fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});

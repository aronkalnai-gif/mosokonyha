import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDialog } from '../components/Dialog';
import { Button, Card, Muted } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { isStandalone } from '../lib/push';
import { colors } from '../lib/theme';
import { ROOM_PATTERN } from '../lib/machines';
import { formatHuf } from '../lib/time';
import { usePushState } from '../lib/usePushState';
import { useAuth } from '../state/auth';
import { useLaundry } from '../state/laundry';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { profile, updateProfile, leave } = useAuth();
  const dialog = useDialog();
  const { settings } = useLaundry();
  const push = usePushState();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [room, setRoom] = useState(profile?.room ?? '');
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== profile?.display_name || room.trim() !== profile?.room;
  const valid = name.trim().length >= 2 && ROOM_PATTERN.test(room.trim());

  const saveName = async () => {
    setSaving(true);
    await updateProfile({ display_name: name.trim(), room: room.trim() }).finally(() => setSaving(false));
  };

  const pushText =
    push.state === 'on'
      ? `✅ ${t('pushOn')}`
      : push.state === 'ios-install'
        ? t('pushIosText')
        : push.state === 'denied'
          ? t('pushDenied')
          : push.state === 'unsupported'
            ? t('pushUnsupported')
            : t('pushCardText');

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.nameCol}>
            <Text style={styles.label}>{t('displayName')}</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} />
          </View>
          <View style={styles.roomCol}>
            <Text style={styles.label}>{t('roomLabel')}</Text>
            <TextInput style={styles.input} value={room} onChangeText={setRoom} maxLength={10} inputMode="numeric" />
          </View>
        </View>
        <Button small title={t('save')} onPress={saveName} loading={saving} disabled={!changed || !valid} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>{t('notifications')}</Text>
        <Muted>{pushText}</Muted>
        {push.state === 'off' && <Button small title={t('pushEnable')} onPress={push.enable} />}
      </Card>

      {!isStandalone() && (
        <Card style={styles.card}>
          <Text style={styles.label}>{t('installTitle')}</Text>
          <Muted>{t('installText')}</Muted>
        </Card>
      )}

      <Card style={styles.card}>
        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.row}>
          <Button small style={styles.flex} variant={lang === 'hu' ? 'primary' : 'secondary'} title="Magyar" onPress={() => setLang('hu')} />
          <Button small style={styles.flex} variant={lang === 'en' ? 'primary' : 'secondary'} title="English" onPress={() => setLang('en')} />
        </View>
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

      <Button
        variant="danger"
        title={t('leave')}
        onPress={async () => {
          if (await dialog.confirm(t('leave'), t('leaveConfirm'), t('leave'), true)) leave();
        }}
      />
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
  nameCol: { flex: 1, gap: 6 },
  roomCol: { width: 100, gap: 6 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
});

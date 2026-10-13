import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDialog } from '../components/Dialog';
import { Button, Eyebrow } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { isStandalone } from '../lib/push';
import { colors, font } from '../lib/theme';
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
      ? t('pushOn')
      : push.state === 'ios-install'
        ? t('pushIosText')
        : push.state === 'denied'
          ? t('pushDenied')
          : push.state === 'unsupported'
            ? t('pushUnsupported')
            : t('pushCardText');

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{t('settings')}</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.nameCol}>
            <Eyebrow>{t('displayName')}</Eyebrow>
            <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} />
          </View>
          <View style={styles.roomCol}>
            <Eyebrow>{t('roomLabel')}</Eyebrow>
            <TextInput style={styles.input} value={room} onChangeText={setRoom} maxLength={10} inputMode="numeric" />
          </View>
        </View>
        {changed && <Button small style={styles.start} title={t('save')} onPress={saveName} loading={saving} disabled={!valid} />}
      </View>

      <View style={styles.section}>
        <Eyebrow>{t('notifications')}</Eyebrow>
        <Text style={styles.body}>{pushText}</Text>
        {push.state === 'off' && <Button small style={styles.start} title={t('pushEnable')} onPress={push.enable} />}
      </View>

      {!isStandalone() && (
        <View style={styles.section}>
          <Eyebrow>{t('installTitle')}</Eyebrow>
          <Text style={styles.body}>{t('installText')}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Eyebrow>{t('language')}</Eyebrow>
        <View style={styles.segment}>
          {(['hu', 'en'] as const).map((l) => (
            <Pressable key={l} onPress={() => setLang(l)} style={[styles.segmentItem, lang === l && styles.segmentOn]}>
              <Text style={[styles.segmentText, lang === l && styles.segmentTextOn]}>{l === 'hu' ? 'Magyar' : 'English'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Eyebrow>{t('rules')}</Eyebrow>
        <Text style={styles.body}>
          {t('rulesText', {
            hours: settings.key_minutes / 60,
            block: settings.fee_block_minutes,
            fee: formatHuf(settings.fee_huf),
          })}
        </Text>
      </View>

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
  page: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48, gap: 8 },
  title: { fontSize: 30, fontWeight: font.light, color: colors.text, letterSpacing: -0.6, marginBottom: 12 },
  section: { gap: 10, paddingVertical: 18, borderTopWidth: 1, borderTopColor: colors.border },
  body: { fontSize: 15, color: colors.text, lineHeight: 22 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', gap: 10 },
  nameCol: { flex: 1, gap: 8 },
  roomCol: { width: 100, gap: 8 },
  start: { alignSelf: 'flex-start' },
  segment: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 3 },
  segmentItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9 },
  segmentOn: { backgroundColor: colors.text },
  segmentText: { fontSize: 14, color: colors.text },
  segmentTextOn: { color: colors.primaryText },
});

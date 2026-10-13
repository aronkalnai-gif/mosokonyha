// Banner at the top of the key list about the user's favourite floor.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import { formatDuration, keyState } from '../lib/time';
import { useWatch } from '../lib/useWatch';
import { useAuth } from '../state/auth';
import { useLaundry } from '../state/laundry';
import { Button, Eyebrow } from './ui';

export function FavoriteBanner({ now }: { now: number }) {
  const { profile } = useAuth();
  const { floors } = useLaundry();
  const floor = profile?.favorite_floor;
  const status = floors.find((f) => f.floor === floor);
  if (!floor || !status) return null;
  return <Banner floor={floor} holderId={status.holder_id} pickedUpAt={status.picked_up_at} now={now} />;
}

function Banner({
  floor,
  holderId,
  pickedUpAt,
  now,
}: {
  floor: number;
  holderId: string | null;
  pickedUpAt: string | null;
  now: number;
}) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { myFloor, settings } = useLaundry();
  const { watching, busy, toggle } = useWatch(floor);

  const free = !holderId;
  const mine = !!profile && holderId === profile.id;
  const k = pickedUpAt ? keyState(new Date(pickedUpAt), now, settings) : null;

  const tone = free ? styles.free : mine ? styles.mine : styles.taken;
  const dot = free ? colors.free : mine ? colors.text : colors.taken;

  let headline: string;
  let detail: string | null = null;
  if (free) {
    headline = t('favFree');
  } else if (mine) {
    headline = t('favMine');
    if (k) detail = k.overdue ? t('overdueBy', { time: formatDuration(k.overMs) }) : t('remaining', { time: formatDuration(k.remainingMs) });
  } else {
    headline = t('favTaken');
    if (k) detail = k.overdue ? t('favOverdue') : t('favFreesIn', { time: formatDuration(k.remainingMs) });
  }

  return (
    <View style={[styles.banner, tone]} accessibilityRole="summary">
      <View style={styles.text}>
        <Eyebrow>{t('favLabel', { floor })}</Eyebrow>
        <View style={styles.headlineRow}>
          <View style={[styles.dot, { backgroundColor: dot }]} />
          <Text style={styles.headline}>{headline}</Text>
        </View>
        {detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      {free && !myFloor && (
        <Button
          small
          title={t('pickUpKey')}
          onPress={() => router.push({ pathname: '/scan', params: { mode: 'pickup', floor: String(floor) } })}
        />
      )}
      {!free && !mine && (
        <Button small variant={watching ? 'primary' : 'secondary'} title={watching ? t('notifying') : t('notifyMe')} onPress={toggle} loading={busy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: radius,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  free: { backgroundColor: colors.freeBg },
  taken: { backgroundColor: colors.takenBg },
  mine: { backgroundColor: colors.sand },
  text: { flex: 1, minWidth: 160, gap: 6 },
  headlineRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headline: { fontSize: 22, fontWeight: font.light, color: colors.text, letterSpacing: -0.3 },
  detail: { fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
});

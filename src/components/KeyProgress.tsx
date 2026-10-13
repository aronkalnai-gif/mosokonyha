import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { Settings } from '../lib/supabase';
import { colors, font } from '../lib/theme';
import { formatClock, formatDuration, formatHuf, keyState } from '../lib/time';
import { ProgressBar } from './ui';

/** How much of the key time has passed. The fee is only shown to the key holder. */
export function KeyProgress({
  pickedUpAt,
  now,
  settings,
  mine,
}: {
  pickedUpAt: string;
  now: number;
  settings: Settings;
  mine: boolean;
}) {
  const { t } = useI18n();
  const picked = new Date(pickedUpAt);
  const k = keyState(picked, now, settings);

  return (
    <View style={styles.wrap}>
      <ProgressBar progress={k.progress} color={k.overdue ? colors.danger : k.progress > 0.85 ? colors.taken : colors.text} />
      <View style={styles.row}>
        <Text style={styles.small}>{t('since', { time: formatClock(picked) })}</Text>
        {k.overdue ? (
          <Text style={[styles.small, styles.danger]}>{t('overdueBy', { time: formatDuration(k.overMs) })}</Text>
        ) : (
          <Text style={styles.small}>{t('remaining', { time: formatDuration(k.remainingMs) })}</Text>
        )}
      </View>
      {mine && k.overdue && (
        <View style={styles.fee}>
          <Text style={styles.feeLabel}>{t('toPayLabel')}</Text>
          <Text style={styles.feeText}>{formatHuf(k.fee)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  danger: { color: colors.danger, fontWeight: font.medium },
  fee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    backgroundColor: colors.dangerBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  feeLabel: { color: colors.danger, fontSize: 14 },
  feeText: { color: colors.danger, fontWeight: font.medium, fontSize: 20, fontVariant: ['tabular-nums'] },
});

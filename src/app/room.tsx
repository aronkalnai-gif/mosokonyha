import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DurationPicker } from '../components/DurationPicker';
import { MachineGlyph } from '../components/icons';
import { KeyProgress } from '../components/KeyProgress';
import { Button, Eyebrow, Muted, ProgressBar } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { Machine, machinesOnFloor } from '../lib/machines';
import { colors, font, radius } from '../lib/theme';
import { formatClock, formatDuration } from '../lib/time';
import { useNow } from '../lib/useNow';
import { ServerError, useLaundry } from '../state/laundry';
import { MachineTimer, useTimers } from '../state/timers';

const PRESETS: Record<Machine['kind'], number[]> = {
  washer: [30, 45, 60, 90, 120],
  dryer: [30, 60, 90, 120],
};

export default function Room() {
  const { t } = useI18n();
  const { myFloor, settings } = useLaundry();
  const { timers } = useTimers();
  const now = useNow(1000);
  const [selected, setSelected] = useState<Machine | null>(null);

  if (!myFloor?.picked_up_at) {
    return (
      <View style={styles.empty}>
        <Muted>{t('noKey')}</Muted>
        <Button variant="secondary" title={t('back')} onPress={() => router.back()} />
      </View>
    );
  }

  const floor = myFloor.floor;
  const machines = machinesOnFloor(floor);
  const label = (m: Machine) => (m.kind === 'washer' ? t('washer', { n: m.number }) : t('dryer'));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: '' }} />

      <View style={styles.head}>
        <Text style={styles.title}>{t('roomTitle', { floor })}</Text>
        <Muted>{t('tapToStart')}</Muted>
      </View>

      <View style={styles.grid}>
        {machines.map((m) => (
          <MachineTile key={m.id} machine={m} label={label(m)} timer={timers[m.id]} now={now} onPress={() => setSelected(m)} />
        ))}
      </View>

      <View style={styles.keyCard}>
        <Eyebrow>{t('keyTime')}</Eyebrow>
        <KeyProgress pickedUpAt={myFloor.picked_up_at} now={now} settings={settings} mine />
      </View>

      <Button
        variant="secondary"
        title={t('returnKey')}
        onPress={() => router.push({ pathname: '/scan', params: { mode: 'return' } })}
      />

      {selected && (
        <TimerSheet
          machine={selected}
          label={label(selected)}
          timer={timers[selected.id]}
          now={now}
          onClose={() => setSelected(null)}
        />
      )}
    </ScrollView>
  );
}

function MachineTile({
  machine,
  label,
  timer,
  now,
  onPress,
}: {
  machine: Machine;
  label: string;
  timer?: MachineTimer;
  now: number;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const running = !!timer && timer.endsAt > now;
  const finished = !!timer && timer.endsAt <= now;
  const progress = timer ? (now - timer.startedAt) / (timer.endsAt - timer.startedAt) : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, running && styles.tileRunning, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.tileTop}>
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.dot, { backgroundColor: running ? colors.free : finished ? colors.taken : colors.border }]} />
      </View>

      <View style={styles.glyph}>
        <MachineGlyph size={64} color={running ? colors.text : colors.faint} running={running} />
      </View>

      {running ? (
        <View style={styles.tileStatus}>
          <Text style={styles.remaining}>{formatDuration(timer.endsAt - now)}</Text>
          <ProgressBar progress={progress} color={colors.text} height={2} />
          <Text style={styles.tileHint}>{t('finishesAt', { time: formatClock(new Date(timer.endsAt)) })}</Text>
        </View>
      ) : (
        <View style={styles.tileStatus}>
          <Text style={[styles.idle, finished && { color: colors.taken }]}>{finished ? t('finished') : t('idle')}</Text>
        </View>
      )}
    </Pressable>
  );
}

function TimerSheet({
  machine,
  label,
  timer,
  now,
  onClose,
}: {
  machine: Machine;
  label: string;
  timer?: MachineTimer;
  now: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { start, extend, stop } = useTimers();
  const presets = PRESETS[machine.kind];
  const [minutes, setMinutes] = useState(machine.kind === 'washer' ? 60 : 90);
  const running = !!timer && timer.endsAt > now;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (fn: () => Promise<void>, close = false) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (close) onClose();
    } catch (e) {
      setError(errorText(t, e instanceof ServerError ? e.code : String(e)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Eyebrow>{t('timer')}</Eyebrow>
        <Text style={styles.sheetTitle}>{label}</Text>

        {running ? (
          <>
            <Text style={styles.bigTime}>{formatDuration(timer.endsAt - now)}</Text>
            <Text style={styles.finishes}>{t('finishesAt', { time: formatClock(new Date(timer.endsAt)) })}</Text>
            <View style={styles.row}>
              <Button style={styles.flex} variant="secondary" title={t('add1')} onPress={() => act(() => extend(machine, 1))} />
              <Button style={styles.flex} variant="secondary" title={t('add5')} onPress={() => act(() => extend(machine, 5))} />
            </View>
            <Button variant="danger" title={t('stop')} onPress={() => act(() => stop(machine), true)} />
          </>
        ) : (
          <>
            <View style={styles.presets}>
              {presets.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setMinutes(p)}
                  style={({ pressed }) => [styles.preset, minutes === p && styles.presetOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.presetText, minutes === p && styles.presetTextOn]}>{t('minutes', { n: p })}</Text>
                </Pressable>
              ))}
            </View>
            <DurationPicker
              minutes={minutes}
              onChange={setMinutes}
              hoursLabel={t('hoursUnit')}
              minutesLabel={t('minutesUnit')}
            />
            <Text style={styles.finishes}>
              {minutes > 0 ? t('finishesAt', { time: formatClock(new Date(now + minutes * 60_000)) }) : ' '}
            </Text>
            <Button
              title={t('start')}
              onPress={() => act(() => start(machine, minutes), true)}
              loading={busy}
              disabled={minutes < 1}
            />
            {timer && <Button variant="ghost" title={t('stop')} onPress={() => act(() => stop(machine), true)} />}
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <Button variant="ghost" title={t('cancel')} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48, gap: 20 },
  empty: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  head: { gap: 6 },
  title: { fontSize: 30, fontWeight: font.light, color: colors.text, letterSpacing: -0.6 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  tileRunning: { borderColor: colors.text },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileLabel: { fontSize: 14, fontWeight: font.medium, color: colors.text },
  dot: { width: 7, height: 7, borderRadius: 4 },
  glyph: { alignItems: 'center', paddingVertical: 4 },
  tileStatus: { gap: 6, minHeight: 52, justifyContent: 'flex-end' },
  remaining: { fontSize: 26, fontWeight: font.light, color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  idle: { fontSize: 13, color: colors.muted },
  tileHint: { fontSize: 12, color: colors.muted },

  keyCard: { backgroundColor: colors.sand, borderRadius: radius, padding: 20, gap: 10 },

  backdrop: { flex: 1, backgroundColor: 'rgba(35,38,43,0.28)' },
  sheet: {
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 },
  sheetTitle: { fontSize: 24, fontWeight: font.light, color: colors.text, marginTop: -6 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  presetOn: { borderColor: colors.text, backgroundColor: colors.text },
  presetText: { color: colors.text, fontSize: 13 },
  presetTextOn: { color: colors.primaryText },
  finishes: { textAlign: 'center', color: colors.muted, fontSize: 14 },
  bigTime: { fontSize: 56, fontWeight: font.light, color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  error: { color: colors.danger, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});

import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { KeyProgress } from '../components/KeyProgress';
import { Button, Card, Muted, ProgressBar } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { Machine, machinesOnFloor } from '../lib/machines';
import { colors } from '../lib/theme';
import { formatClock, formatDuration } from '../lib/time';
import { useNow } from '../lib/useNow';
import { useLaundry } from '../state/laundry';
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
        <Button title={t('back')} onPress={() => router.back()} />
      </View>
    );
  }

  const floor = myFloor.floor;
  const machines = machinesOnFloor(floor);
  const label = (m: Machine) => (m.kind === 'washer' ? t('washer', { n: m.number }) : t('dryer'));

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Stack.Screen options={{ title: t('roomTitle', { floor }) }} />

      <Card style={styles.keyCard}>
        <Text style={styles.section}>{t('keyTime')}</Text>
        <KeyProgress pickedUpAt={myFloor.picked_up_at} now={now} settings={settings} mine />
      </Card>

      <View style={styles.grid}>
        {machines.map((m) => (
          <MachineTile key={m.id} machine={m} label={label(m)} timer={timers[m.id]} now={now} onPress={() => setSelected(m)} />
        ))}
      </View>

      <Button
        variant="secondary"
        title={t('returnKey')}
        onPress={() => router.push({ pathname: '/scan', params: { mode: 'return' } })}
      />

      {selected && (
        <TimerSheet
          machine={selected}
          floor={floor}
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
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) return;
    spin.setValue(0);
    const anim = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2500, easing: Easing.linear, useNativeDriver: true }),
    );
    anim.start();
    return () => anim.stop();
  }, [running, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const accent = machine.kind === 'washer' ? colors.primary : '#6A1B9A';
  const progress = timer ? (now - timer.startedAt) / (timer.endsAt - timer.startedAt) : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, finished && styles.tileDone, pressed && { opacity: 0.8 }]}
    >
      {/* control panel strip */}
      <View style={styles.panel}>
        <View style={[styles.led, { backgroundColor: running ? '#43A047' : finished ? '#FB8C00' : '#B0BEC5' }]} />
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      {/* door */}
      <View style={[styles.door, { borderColor: accent }]}>
        <Animated.View style={[styles.drum, running && { transform: [{ rotate }] }]}>
          <Text style={styles.drumIcon}>{machine.kind === 'washer' ? '🫧' : '🌀'}</Text>
          <View style={[styles.paddle, { backgroundColor: accent }]} />
        </Animated.View>
      </View>
      {running ? (
        <>
          <Text style={styles.remaining}>{formatDuration(timer.endsAt - now)}</Text>
          <ProgressBar progress={progress} color={accent} height={6} />
          <Text style={styles.tileHint}>{formatClock(new Date(timer.endsAt))}</Text>
        </>
      ) : finished ? (
        <Text style={[styles.remaining, { color: colors.taken }]}>{t('finished')}</Text>
      ) : (
        <Text style={styles.tileHint}>{t('tapToStart')}</Text>
      )}
    </Pressable>
  );
}

function TimerSheet({
  machine,
  floor,
  label,
  timer,
  now,
  onClose,
}: {
  machine: Machine;
  floor: number;
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

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>{t('setTimer', { machine: label })}</Text>

        {running ? (
          <>
            <Text style={styles.bigTime}>{formatDuration(timer.endsAt - now)}</Text>
            <View style={styles.row}>
              <Button style={styles.flex} variant="secondary" title={t('add5')} onPress={() => extend(machine, floor, label, 5)} />
              <Button
                style={styles.flex}
                variant="danger"
                title={t('stop')}
                onPress={() => {
                  stop(machine, floor, label);
                  onClose();
                }}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.presets}>
              {presets.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setMinutes(p)}
                  style={[styles.preset, minutes === p && styles.presetOn]}
                >
                  <Text style={[styles.presetText, minutes === p && styles.presetTextOn]}>{t('minutes', { n: p })}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.stepper}>
              <Button small variant="secondary" title="−5" onPress={() => setMinutes((m) => Math.max(5, m - 5))} />
              <Text style={styles.bigTime}>{t('minutes', { n: minutes })}</Text>
              <Button small variant="secondary" title="+5" onPress={() => setMinutes((m) => Math.min(300, m + 5))} />
            </View>
            {timer && (
              <Button variant="ghost" title={t('stop')} onPress={() => { stop(machine, floor, label); onClose(); }} />
            )}
            <Button
              title={t('start')}
              onPress={() => {
                start(machine, floor, label, minutes);
                onClose();
              }}
            />
          </>
        )}
        <Button variant="ghost" title={t('cancel')} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 16, paddingBottom: 40 },
  empty: { flex: 1, padding: 24, gap: 16, justifyContent: 'center' },
  keyCard: { gap: 8 },
  section: { fontWeight: '700', color: colors.text, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  tile: {
    width: '47%',
    backgroundColor: '#FAFCFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  tileDone: { borderColor: colors.taken },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    backgroundColor: colors.track,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  led: { width: 10, height: 10, borderRadius: 5 },
  tileLabel: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 13 },
  door: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 6,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drum: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: '#BBDEFB' },
  drumIcon: { fontSize: 30 },
  paddle: { position: 'absolute', top: 4, width: 14, height: 6, borderRadius: 3 },
  remaining: { fontSize: 22, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  tileHint: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.card, padding: 20, gap: 14, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  presetOn: { borderColor: colors.primary, backgroundColor: '#E3F2FD' },
  presetText: { color: colors.text, fontWeight: '600' },
  presetTextOn: { color: colors.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigTime: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center', fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});

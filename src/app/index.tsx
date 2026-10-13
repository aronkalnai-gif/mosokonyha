import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDialog } from '../components/Dialog';
import { KeyProgress } from '../components/KeyProgress';
import { Button, Card, Muted, Pill } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { machinesOnFloor } from '../lib/machines';
import { FloorStatus } from '../lib/supabase';
import { colors } from '../lib/theme';
import { useNow } from '../lib/useNow';
import { usePushState } from '../lib/usePushState';
import { useAuth } from '../state/auth';
import { ServerError, useLaundry } from '../state/laundry';

export default function Home() {
  const { t } = useI18n();
  const { floors, myFloor, settings, refresh, loaded } = useLaundry();
  const now = useNow(1000);
  const [refreshing, setRefreshing] = useState(false);
  const freeCount = floors.filter((f) => !f.holder_id).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh().finally(() => setRefreshing(false));
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel={t('settings')}>
              <Text style={styles.gear}>⚙️</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {myFloor?.picked_up_at && (
          <Card style={styles.myKey}>
            <Text style={styles.myKeyLabel}>{t('myKey')}</Text>
            <Text style={styles.floorTitle}>{t('floor', { floor: myFloor.floor })}</Text>
            <KeyProgress pickedUpAt={myFloor.picked_up_at} now={now} settings={settings} mine />
            <View style={styles.row}>
              <Button style={styles.flex} title={t('openRoom')} onPress={() => router.push('/room')} />
              <Button
                style={styles.flex}
                variant="secondary"
                title={t('returnKey')}
                onPress={() => router.push({ pathname: '/scan', params: { mode: 'return' } })}
              />
            </View>
          </Card>
        )}

        <PushCard />

        {loaded && (
          <Text style={[styles.summary, { color: freeCount ? colors.free : colors.taken }]}>
            {freeCount ? t('freeCount', { n: freeCount }) : t('noneFree')}
          </Text>
        )}

        {floors.map((f) => (
          <FloorCard key={f.floor} status={f} now={now} />
        ))}
      </ScrollView>
    </>
  );
}

function FloorCard({ status, now }: { status: FloorStatus; now: number }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { myFloor, settings, watches, toggleWatch, forceReturn } = useLaundry();
  const dialog = useDialog();
  const push = usePushState();
  const [busy, setBusy] = useState(false);

  const free = !status.holder_id;
  const mine = !!profile && status.holder_id === profile.id;
  const watching = watches.has(status.floor);
  const machines = machinesOnFloor(status.floor);
  const washers = machines.filter((m) => m.kind === 'washer').length;

  const onWatch = async () => {
    // Without notifications there is no way to tell you, so turn them on first.
    if (!watching && push.state !== 'on') {
      const state = await push.enable();
      if (state !== 'on') return dialog.alert(t('notifyMe'), `${t('pushNeeded')}\n\n${pushHelp(t, state)}`);
    }
    setBusy(true);
    try {
      await toggleWatch(status.floor);
    } catch (e) {
      dialog.alert(errorText(t, e instanceof ServerError ? e.code : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const onForce = async () => {
    const ok = await dialog.confirm(
      t('forceReturn'),
      t('forceReturnConfirm', { floor: status.floor, name: status.holder_name ?? '' }),
      t('forceReturn'),
      true,
    );
    if (!ok) return;
    forceReturn(status.floor).catch((e) => dialog.alert(errorText(t, e instanceof ServerError ? e.code : String(e))));
  };

  return (
    <Card style={[styles.floorCard, mine ? styles.mineCard : {}]}>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.floorTitle}>{t('floor', { floor: status.floor })}</Text>
          <Muted>{`🫧 ×${washers}   🌀 ×1`}</Muted>
        </View>
        {free ? (
          <Pill label={t('free')} color={colors.free} bg={colors.freeBg} />
        ) : (
          <Pill label={t('taken')} color={colors.taken} bg={colors.takenBg} />
        )}
      </View>

      {!free && status.picked_up_at && (
        <>
          <Text style={styles.holder}>
            🔑 {status.holder_name}
            {mine ? ` (${t('you')})` : ''}
          </Text>
          <KeyProgress pickedUpAt={status.picked_up_at} now={now} settings={settings} mine={mine} />
        </>
      )}

      {free && !myFloor && (
        <Button
          title={t('pickUpKey')}
          onPress={() => router.push({ pathname: '/scan', params: { mode: 'pickup', floor: String(status.floor) } })}
        />
      )}

      {!free && !mine && (
        <View style={styles.row}>
          <Button
            small
            style={styles.flex}
            variant={watching ? 'primary' : 'secondary'}
            title={watching ? `🔔 ${t('notifying')}` : `🔕 ${t('notifyMe')}`}
            onPress={onWatch}
            loading={busy}
          />
          {profile?.is_admin && <Button small variant="danger" title={t('forceReturn')} onPress={onForce} />}
        </View>
      )}
    </Card>
  );
}

/** Explains what to do when notifications aren't on. */
function pushHelp(t: ReturnType<typeof useI18n>['t'], state: string | null): string {
  if (state === 'ios-install') return t('pushIosText');
  if (state === 'denied') return t('pushDenied');
  if (state === 'unsupported') return t('pushUnsupported');
  return '';
}

function PushCard() {
  const { t } = useI18n();
  const { state, enable } = usePushState();
  const [hidden, setHidden] = useState(false);
  if (hidden || (state !== 'off' && state !== 'ios-install')) return null;

  return (
    <Card style={styles.pushCard}>
      <Text style={styles.pushTitle}>🔔 {state === 'ios-install' ? t('pushIosTitle') : t('pushCardTitle')}</Text>
      <Muted>{state === 'ios-install' ? t('pushIosText') : t('pushCardText')}</Muted>
      <View style={styles.row}>
        {state === 'off' && <Button small style={styles.flex} title={t('pushEnable')} onPress={enable} />}
        <Button small variant="ghost" title={t('later')} onPress={() => setHidden(true)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  gear: { fontSize: 22 },
  pushCard: { gap: 8, backgroundColor: '#E3F2FD', borderColor: '#BBDEFB' },
  pushTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  myKey: { borderColor: colors.primary, borderWidth: 2, gap: 10 },
  myKeyLabel: { color: colors.primary, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
  summary: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  floorCard: { gap: 10 },
  mineCard: { borderColor: colors.primary },
  floorTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  holder: { fontSize: 15, color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  flex: { flex: 1 },
});

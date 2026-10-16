import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDialog } from '../components/Dialog';
import { ChatIcon, SettingsIcon } from '../components/icons';
import { KeyProgress } from '../components/KeyProgress';
import { Button, Eyebrow, Muted, Status } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { FLOORS, holderLabel, machinesOnFloor } from '../lib/machines';
import { FloorStatus } from '../lib/supabase';
import { colors, font, radius } from '../lib/theme';
import { useNow } from '../lib/useNow';
import { usePushState } from '../lib/usePushState';
import { useWatch } from '../lib/useWatch';
import { FavoriteBanner } from '../components/FavoriteBanner';
import { useAuth } from '../state/auth';
import { ServerError, useLaundry } from '../state/laundry';
import { useMessages } from '../state/messages';

export default function Home() {
  const { t } = useI18n();
  const { floors, myFloor, settings, refresh, loaded } = useLaundry();
  const { loggedIn, registered } = useAuth();
  const { unreadTotal } = useMessages();
  const now = useNow(1000);
  const [refreshing, setRefreshing] = useState(false);
  const freeCount = floors.filter((f) => !f.holder_id).length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh().finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('appName')}</Text>
            {loaded && (
              <Text style={styles.summary}>
                {freeCount ? t('freeOf', { n: freeCount, total: FLOORS.length }) : t('noneFree')}
              </Text>
            )}
          </View>
          {!loggedIn && (
            <Pressable onPress={() => router.push('/login')} hitSlop={10} style={styles.loginLink} accessibilityRole="link">
              <Text style={styles.loginText}>{t('loginTab')}</Text>
            </Pressable>
          )}
          {registered && (
            <Pressable
              onPress={() => router.push('/messages')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={unreadTotal ? t('messagesUnread', { n: unreadTotal }) : t('messages')}
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
            >
              <ChatIcon />
              {unreadTotal > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadTotal}</Text>
                </View>
              )}
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('settings')}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
          >
            <SettingsIcon />
          </Pressable>
        </View>

        <FavoriteBanner now={now} />

        {myFloor?.picked_up_at && (
          <View style={styles.myKey}>
            <Eyebrow>{t('myKey')}</Eyebrow>
            <Text style={styles.myKeyFloor}>{t('floor', { floor: myFloor.floor })}</Text>
            <KeyProgress pickedUpAt={myFloor.picked_up_at} now={now} settings={settings} mine />
            <View style={styles.row}>
              <Button style={styles.flex} title={t('openRoom')} onPress={() => router.push('/room')} />
              <Button
                style={styles.flex}
                variant="secondary"
                title={t('returnShort')}
                onPress={() => router.push({ pathname: '/scan', params: { mode: 'return' } })}
              />
            </View>
          </View>
        )}

        <PushCard />

        <View style={styles.list}>
          {floors.map((f, i) => (
            <FloorRow key={f.floor} status={f} now={now} last={i === floors.length - 1} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FloorRow({ status, now, last }: { status: FloorStatus; now: number; last: boolean }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const { myFloor, settings, forceReturn } = useLaundry();
  const dialog = useDialog();
  const { watching, busy, toggle: onWatch } = useWatch(status.floor);

  const free = !status.holder_id;
  const mine = !!profile && status.holder_id === profile.id;
  const washers = machinesOnFloor(status.floor).filter((m) => m.kind === 'washer').length;

  const onForce = async () => {
    const ok = await dialog.confirm(
      t('forceReturn'),
      t('forceReturnConfirm', { floor: status.floor, name: holderLabel(status.holder_name, status.holder_room) }),
      t('forceReturn'),
      true,
    );
    if (!ok) return;
    forceReturn(status.floor).catch((e) => dialog.alert(errorText(t, e instanceof ServerError ? e.code : String(e))));
  };

  return (
    <View style={[styles.floorRow, !last && styles.divider]}>
      <View style={styles.floorNumberCol}>
        <Text style={styles.floorNumber}>{status.floor}</Text>
        <Text style={styles.floorWord}>{t('floorWord')}</Text>
      </View>

      <View style={styles.floorBody}>
        <View style={styles.rowBetween}>
          {free ? (
            <Status label={t('free')} color={colors.free} />
          ) : (
            <Status label={mine ? t('yours') : t('taken')} color={mine ? colors.text : colors.taken} />
          )}
          <Text style={styles.machines}>{washers === 1 ? t('machinesSummary1') : t('machinesSummary', { n: washers })}</Text>
        </View>

        {!free && status.picked_up_at && (
          <>
            {/* Names are only shown to people who have picked up a key before. */}
            {status.holder_name && <Text style={styles.holder}>{holderLabel(status.holder_name, status.holder_room)}</Text>}
            <KeyProgress pickedUpAt={status.picked_up_at} now={now} settings={settings} mine={mine} />
          </>
        )}

        {free && !myFloor && (
          <Button
            small
            style={styles.action}
            title={t('pickUpKey')}
            onPress={() => router.push({ pathname: '/scan', params: { mode: 'pickup', floor: String(status.floor) } })}
          />
        )}

        {!free && !mine && (
          <View style={[styles.row, styles.action]}>
            <Button
              small
              variant={watching ? 'primary' : 'secondary'}
              title={watching ? t('notifying') : t('notifyMe')}
              onPress={onWatch}
              loading={busy}
            />
            {/* Real holder (names are visible): you can write to them. */}
            {status.holder_id && status.holder_name && (
              <Button
                small
                variant="secondary"
                title={t('message')}
                onPress={() =>
                  router.push({
                    pathname: '/chat',
                    params: {
                      with: status.holder_id!,
                      floor: String(status.floor),
                      name: status.holder_name ?? '',
                      room: status.holder_room ?? '',
                    },
                  })
                }
              />
            )}
            {profile?.is_admin && <Button small variant="danger" title={t('forceReturn')} onPress={onForce} />}
          </View>
        )}
      </View>
    </View>
  );
}

function PushCard() {
  const { t } = useI18n();
  const { state, enable } = usePushState();
  const [hidden, setHidden] = useState(false);
  if (hidden || (state !== 'off' && state !== 'ios-install')) return null;

  return (
    <View style={styles.pushCard}>
      <Text style={styles.pushTitle}>{state === 'ios-install' ? t('pushIosTitle') : t('pushCardTitle')}</Text>
      <Muted>{state === 'ios-install' ? t('pushIosText') : t('pushCardText')}</Muted>
      <View style={styles.row}>
        {state === 'off' && <Button small title={t('pushEnable')} onPress={enable} />}
        <Button small variant="ghost" title={t('later')} onPress={() => setHidden(true)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 48, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerText: { gap: 6, flex: 1 },
  title: { fontSize: 34, fontWeight: font.light, color: colors.text, letterSpacing: -0.8 },
  summary: { fontSize: 15, color: colors.muted },
  iconButton: { padding: 8, marginTop: 6, borderRadius: 12 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: font.semibold },
  loginLink: { paddingVertical: 10, paddingHorizontal: 6, marginTop: 6 },
  loginText: { fontSize: 14, color: colors.text, fontWeight: font.medium },

  myKey: { backgroundColor: colors.sand, borderRadius: radius, padding: 20, gap: 12 },
  myKeyFloor: { fontSize: 28, fontWeight: font.light, color: colors.text, letterSpacing: -0.5 },

  pushCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius, padding: 20, gap: 8 },
  pushTitle: { fontSize: 16, fontWeight: font.medium, color: colors.text },

  list: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20 },
  floorRow: { flexDirection: 'row', gap: 18, paddingVertical: 18 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  floorNumberCol: { width: 44, alignItems: 'flex-start' },
  floorNumber: { fontSize: 34, fontWeight: font.light, color: colors.text, lineHeight: 38, letterSpacing: -1 },
  floorWord: { fontSize: 11, color: colors.faint, letterSpacing: 0.6, textTransform: 'uppercase' },
  floorBody: { flex: 1, gap: 8, paddingTop: 4 },
  machines: { fontSize: 12, color: colors.faint },
  holder: { fontSize: 15, color: colors.text, fontWeight: font.medium },
  action: { alignSelf: 'flex-start', marginTop: 2 },

  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1 },
});

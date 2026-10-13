import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { cancelLiveTimer, showLiveTimer } from '../../modules/live-timer';
import { T } from './i18n';
import { MINUTE, formatHuf } from './time';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Channel ids. 'key-free' must match the channelId the database puts in push messages.
const REMINDERS = 'reminders';
const KEY_FREE = 'key-free';

// Ids of the lock-screen countdowns (see modules/live-timer).
const KEY_LIVE_ID = 1;
const machineLiveId = (machineIndex: number) => 100 + machineIndex;

export async function setupChannels(t: T) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDERS, {
    name: t('channelReminders'),
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync(KEY_FREE, {
    name: t('channelKeyFree'),
    importance: Notifications.AndroidImportance.HIGH,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function hasPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Expo push token, or null if push isn't configured (see README) or not permitted. */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice || !(await hasPermission())) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    console.warn('Push token unavailable', e);
    return null;
  }
}

async function scheduleAt(identifier: string, date: Date, title: string, body: string) {
  await Notifications.cancelScheduledNotificationAsync(identifier);
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: REMINDERS },
  });
}

/** Lock-screen countdown + reminders for the key the user holds. */
export async function syncKeyNotifications(
  t: T,
  key: { floor: number; dueAt: Date; feeHuf: number } | null,
) {
  if (!key) {
    cancelLiveTimer(KEY_LIVE_ID);
    await Notifications.cancelScheduledNotificationAsync('key-soon');
    await Notifications.cancelScheduledNotificationAsync('key-over');
    return;
  }
  showLiveTimer(KEY_LIVE_ID, t('liveKeyTitle', { floor: key.floor }), t('liveKeyBody'), key.dueAt, {
    removeAtEnd: false,
  });
  await scheduleAt(
    'key-soon',
    new Date(key.dueAt.getTime() - 15 * MINUTE),
    t('reminderSoonTitle'),
    t('reminderSoonBody', { floor: key.floor }),
  );
  await scheduleAt('key-over', key.dueAt, t('reminderOverTitle'), t('reminderOverBody', { fee: formatHuf(key.feeHuf) }));
}

/** Lock-screen countdown + "finished" alert for a machine timer. */
export async function syncMachineNotification(
  t: T,
  machine: { id: string; index: number; label: string; floor: number },
  endsAt: Date | null,
) {
  const id = `machine-${machine.id}`;
  if (!endsAt || endsAt.getTime() <= Date.now()) {
    cancelLiveTimer(machineLiveId(machine.index));
    if (!endsAt) await Notifications.cancelScheduledNotificationAsync(id);
    return;
  }
  showLiveTimer(machineLiveId(machine.index), machine.label, t('liveMachineBody', { floor: machine.floor }), endsAt, {
    removeAtEnd: true,
  });
  await scheduleAt(
    id,
    endsAt,
    t('machineDoneTitle', { machine: machine.label }),
    t('machineDoneBody', { floor: machine.floor }),
  );
}

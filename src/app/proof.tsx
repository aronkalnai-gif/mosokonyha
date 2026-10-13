import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { formatClock, formatHuf, keyState } from '../lib/time';
import { useNow } from '../lib/useNow';
import { useAuth } from '../state/auth';
import { useLaundry } from '../state/laundry';

/**
 * Shown to the receptionist after scanning the QR code. The moving background
 * and ticking clock make it easy to tell apart from a screenshot.
 */
export default function Proof() {
  useKeepAwake();
  const { t } = useI18n();
  const { profile } = useAuth();
  const { settings } = useLaundry();
  const p = useLocalSearchParams<{
    kind: 'pickup' | 'return';
    floor: string;
    pickedUpAt: string;
    returnedAt: string;
    overtime: string;
    fee: string;
  }>();
  const now = useNow(250);
  const isPickup = p.kind === 'pickup';
  const fee = Number(p.fee) || 0;
  const pickedUpAt = new Date(p.pickedUpAt);

  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    const b = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pulse, spin]);

  const palette = isPickup ? ['#1565C0', '#00897B'] : fee > 0 ? ['#C62828', '#EF6C00'] : ['#2E7D32', '#00897B'];
  const bg = pulse.interpolate({ inputRange: [0, 1], outputRange: palette });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.fill, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.show}>{t('proofShow')}</Text>

        <View style={styles.center}>
          <Animated.Text style={[styles.icon, { transform: [{ rotate }] }]}>{isPickup ? '🔑' : '✅'}</Animated.Text>
          <Text style={styles.big}>{isPickup ? t('proofPickup') : t('proofReturn')}</Text>
          <Text style={styles.floor}>{t('floor', { floor: p.floor })}</Text>
          <Text style={styles.name}>{profile?.display_name}</Text>
          <Text style={styles.clock}>{formatClock(new Date(now), true)}</Text>
        </View>

        <View style={styles.details}>
          <Text style={styles.detail}>{t('proofPickedAt', { time: formatClock(pickedUpAt) })}</Text>
          {isPickup ? (
            <Text style={styles.detail}>
              {t('proofDue', { time: formatClock(keyState(pickedUpAt, now, settings).dueAt) })}
            </Text>
          ) : (
            <>
              <Text style={styles.detail}>{t('proofReturnedAt', { time: formatClock(new Date(p.returnedAt)) })}</Text>
              {fee > 0 ? (
                <>
                  <Text style={styles.detail}>{t('proofOvertime', { min: p.overtime })}</Text>
                  <Text style={styles.fee}>{t('proofFee', { fee: formatHuf(fee) })}</Text>
                </>
              ) : (
                <Text style={styles.detail}>{t('proofNoFee')}</Text>
              )}
            </>
          )}
          <Text style={styles.live}>● {t('proofLive')}</Text>
        </View>

        <Button variant="secondary" title={t('done')} onPress={() => router.dismissTo('/')} />
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, padding: 24, justifyContent: 'space-between' },
  show: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  center: { alignItems: 'center', gap: 6 },
  icon: { fontSize: 72 },
  big: { color: '#fff', fontSize: 34, fontWeight: '900', textAlign: 'center' },
  floor: { color: '#fff', fontSize: 26, fontWeight: '700' },
  name: { color: '#fff', fontSize: 22 },
  clock: { color: '#fff', fontSize: 56, fontWeight: '200', fontVariant: ['tabular-nums'], marginTop: 8 },
  details: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16, gap: 4 },
  detail: { color: '#fff', fontSize: 17 },
  fee: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 4 },
  live: { color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 8 },
});

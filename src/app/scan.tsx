import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Muted } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { parseReceptionQr } from '../lib/machines';
import { colors } from '../lib/theme';
import { ServerError, useLaundry } from '../state/laundry';
import { useTimers } from '../state/timers';

export default function Scan() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ mode: 'pickup' | 'return'; floor?: string }>();
  const mode = params.mode === 'return' ? 'return' : 'pickup';
  const floor = Number(params.floor);
  const { pickUp, returnKey } = useLaundry();
  const { clear: clearTimers } = useTimers();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const handling = useRef(false);

  const onScanned = async (data: string) => {
    if (handling.current) return;
    const code = parseReceptionQr(data);
    if (!code) return setMessage(t('wrongQr'));

    handling.current = true;
    setBusy(true);
    setMessage(null);
    try {
      const row = mode === 'pickup' ? await pickUp(floor, code) : await returnKey(code);
      if (mode === 'return') clearTimers();
      router.replace({
        pathname: '/proof',
        params: {
          kind: mode,
          floor: String(row.floor),
          pickedUpAt: row.picked_up_at,
          returnedAt: row.returned_at ?? '',
          overtime: String(row.overtime_minutes ?? 0),
          fee: String(row.fee_huf ?? 0),
        },
      });
    } catch (e) {
      setMessage(errorText(t, e instanceof ServerError ? e.code : String(e)));
      setBusy(false);
      // Give the user a moment before the same QR code is picked up again.
      setTimeout(() => (handling.current = false), 1500);
    }
  };

  const title = mode === 'pickup' ? t('scanPickupTitle', { floor }) : t('scanReturnTitle');

  if (!permission) return <View style={styles.center} />;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title }} />
        <Muted style={styles.text}>{t('cameraNeeded')}</Muted>
        <Button title={t('allowCamera')} onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title }} />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : ({ data }) => onScanned(data)}
      />
      <View style={styles.frame} pointerEvents="none" />
      <View style={styles.bottom}>
        {busy ? (
          <View style={styles.row}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.hint}>{t('processing')}</Text>
          </View>
        ) : (
          <Text style={styles.hint}>{t('scanHint')}</Text>
        )}
        {message && <Text style={styles.error}>{message}</Text>}
        <Button variant="secondary" title={t('cancel')} onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, padding: 24, justifyContent: 'center', gap: 16, backgroundColor: colors.bg },
  text: { textAlign: 'center' },
  frame: {
    position: 'absolute',
    alignSelf: 'center',
    top: '22%',
    width: 240,
    height: 240,
    borderWidth: 4,
    borderColor: '#fff',
    borderRadius: 24,
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 24, gap: 12, backgroundColor: 'rgba(0,0,0,0.55)' },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' },
  hint: { color: '#fff', fontSize: 16, textAlign: 'center' },
  error: { color: '#FFCDD2', fontSize: 16, fontWeight: '700', textAlign: 'center' },
});

// Reception page: opened by scanning the printed QR code with the phone's
// camera (the code is a link to /qr?c=<secret>).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Muted } from '../components/ui';
import { useAfterKeyChange } from '../lib/useAfterKeyChange';
import { errorText, useI18n } from '../lib/i18n';
import { holderLabel, isValidSecret } from '../lib/machines';
import { colors } from '../lib/theme';
import { ServerError, useLaundry } from '../state/laundry';
import { takePendingQr } from '../lib/pendingQr';

export default function Qr() {
  const { t } = useI18n();
  const afterKeyChange = useAfterKeyChange();
  const params = useLocalSearchParams<{ c?: string }>();
  const [code] = useState(() => {
    const pending = takePendingQr();
    return params.c ?? pending;
  });
  const { floors, myFloor, pickUp, returnKey, loaded } = useLaundry();
  const [busy, setBusy] = useState<number | 'return' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isValidSecret(code)) {
    return (
      <View style={styles.wrap}>
        <Muted>{t('qrInvalid')}</Muted>
        <Button title={t('back')} onPress={() => router.replace('/')} />
      </View>
    );
  }

  const run = async (what: number | 'return') => {
    setBusy(what);
    setError(null);
    try {
      if (what === 'return') afterKeyChange('return', await returnKey(code));
      else afterKeyChange('pickup', await pickUp(what, code));
    } catch (e) {
      setError(errorText(t, e instanceof ServerError ? e.code : String(e)));
      setBusy(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {!loaded ? null : myFloor ? (
        <Card style={styles.card}>
          <Text style={styles.big}>{t('qrReturnIntro', { floor: myFloor.floor })}</Text>
          <Button title={t('returnKey')} onPress={() => run('return')} loading={busy === 'return'} />
        </Card>
      ) : (
        <>
          <Text style={styles.big}>{t('qrPickIntro')}</Text>
          {floors.map((f) =>
            f.holder_id ? (
              <View key={f.floor} style={styles.taken}>
                <Text style={styles.takenFloor}>{t('floor', { floor: f.floor })}</Text>
                <Muted>{t('qrTakenBy', { name: holderLabel(f.holder_name, f.holder_room) })}</Muted>
              </View>
            ) : (
              <Button
                key={f.floor}
                title={`🔑 ${t('floor', { floor: f.floor })}`}
                onPress={() => run(f.floor)}
                loading={busy === f.floor}
                disabled={busy !== null}
              />
            ),
          )}
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button variant="ghost" title={t('cancel')} onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { gap: 12 },
  big: { fontSize: 18, fontWeight: '700', color: colors.text },
  taken: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.track,
  },
  takenFloor: { fontSize: 16, fontWeight: '600', color: colors.muted },
  error: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
});

// Reception page: opened by scanning the printed QR code with the phone's
// camera (the code is a link to /qr?c=<secret>).
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Muted, Status } from '../components/ui';
import { useAfterKeyChange } from '../lib/useAfterKeyChange';
import { errorText, useI18n } from '../lib/i18n';
import { holderLabel, isValidSecret } from '../lib/machines';
import { colors, font, radius } from '../lib/theme';
import { ServerError, useLaundry } from '../state/laundry';
import { setPendingQr, takePendingQr } from '../lib/pendingQr';
import { useAuth } from '../state/auth';

export default function Qr() {
  const { registered } = useAuth();
  const params = useLocalSearchParams<{ c?: string }>();
  // First time: ask for a name and room number first, then come back here.
  if (!registered) {
    if (isValidSecret(params.c)) setPendingQr(params.c);
    return <Redirect href="/join" />;
  }
  return <Picker />;
}

function Picker() {
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
      <View style={styles.page}>
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
    <ScrollView contentContainerStyle={styles.page}>
      {!loaded ? null : myFloor ? (
        <View style={styles.returnCard}>
          <Text style={styles.title}>{t('qrReturnIntro', { floor: myFloor.floor })}</Text>
          <Button title={t('returnKey')} onPress={() => run('return')} loading={busy === 'return'} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>{t('qrPickIntro')}</Text>
          <View style={styles.list}>
            {floors.map((f, i) => {
              const last = i === floors.length - 1;
              if (f.holder_id) {
                return (
                  <View key={f.floor} style={[styles.item, !last && styles.divider]}>
                    <Text style={[styles.floorNumber, styles.dim]}>{f.floor}</Text>
                    <View style={styles.itemBody}>
                      <Text style={[styles.itemTitle, styles.dim]}>{t('floor', { floor: f.floor })}</Text>
                      <Text style={styles.itemSub}>{t('qrTakenBy', { name: holderLabel(f.holder_name, f.holder_room) })}</Text>
                    </View>
                  </View>
                );
              }
              return (
                <Pressable
                  key={f.floor}
                  onPress={() => run(f.floor)}
                  disabled={busy !== null}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.item, !last && styles.divider, pressed && { opacity: 0.6 }]}
                >
                  <Text style={styles.floorNumber}>{f.floor}</Text>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{t('floor', { floor: f.floor })}</Text>
                    <Status label={t('free')} color={colors.free} />
                  </View>
                  {busy === f.floor ? <ActivityIndicator color={colors.text} /> : <Text style={styles.arrow}>→</Text>}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <Button variant="ghost" title={t('cancel')} onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48, gap: 20 },
  title: { fontSize: 28, fontWeight: font.light, color: colors.text, letterSpacing: -0.5 },
  returnCard: { backgroundColor: colors.sand, borderRadius: radius, padding: 20, gap: 18 },
  list: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  floorNumber: { width: 30, fontSize: 30, fontWeight: font.light, color: colors.text, letterSpacing: -1 },
  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: font.medium, color: colors.text },
  itemSub: { fontSize: 13, color: colors.muted },
  dim: { color: colors.faint },
  arrow: { fontSize: 20, color: colors.text },
  error: { color: colors.danger, textAlign: 'center' },
});

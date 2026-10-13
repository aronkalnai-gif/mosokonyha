// In-page dialogs. Alert.alert does nothing on the web, so we draw our own.
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, font } from '../lib/theme';

type Request = {
  title: string;
  message?: string;
  confirm?: { label: string; destructive?: boolean };
  resolve: (ok: boolean) => void;
};

type Dialogs = {
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (title: string, message: string, label: string, destructive?: boolean) => Promise<boolean>;
};

const DialogContext = createContext<Dialogs | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [req, setReq] = useState<Request | null>(null);

  const alert = useCallback<Dialogs['alert']>(
    (title, message) => new Promise((resolve) => setReq({ title, message, resolve: () => resolve() })),
    [],
  );
  const confirm = useCallback<Dialogs['confirm']>(
    (title, message, label, destructive) =>
      new Promise((resolve) => setReq({ title, message, confirm: { label, destructive }, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {req && (
        <Modal transparent animationType="fade" onRequestClose={() => close(false)}>
          <View style={styles.dim}>
            <View style={styles.box} accessibilityRole="alert">
              <Text style={styles.title}>{req.title}</Text>
              {req.message ? <Text style={styles.message}>{req.message}</Text> : null}
              <View style={styles.buttons}>
                {req.confirm && (
                  <Pressable style={styles.btn} onPress={() => close(false)}>
                    <Text style={styles.btnText}>{t('cancel')}</Text>
                  </Pressable>
                )}
                <Pressable style={styles.btn} onPress={() => close(true)}>
                  <Text style={[styles.btnText, req.confirm?.destructive && { color: colors.danger }]}>
                    {req.confirm?.label ?? t('ok')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): Dialogs {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog outside DialogProvider');
  return ctx;
}

const styles = StyleSheet.create({
  dim: { flex: 1, backgroundColor: 'rgba(35,38,43,0.28)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  box: { backgroundColor: colors.bg, borderRadius: 20, padding: 24, gap: 10, width: '100%', maxWidth: 400 },
  title: { fontSize: 20, fontWeight: font.regular, color: colors.text, letterSpacing: -0.2 },
  message: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 6 },
  btn: { paddingHorizontal: 12, paddingVertical: 8 },
  btnText: { color: colors.text, fontWeight: font.medium, fontSize: 15 },
});

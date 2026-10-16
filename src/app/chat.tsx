// A conversation with one person, usually the holder of a key you'd like next.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Muted } from '../components/ui';
import { errorText, useI18n } from '../lib/i18n';
import { holderLabel } from '../lib/machines';
import { colors, font } from '../lib/theme';
import { formatClock } from '../lib/time';
import { useAuth } from '../state/auth';
import { ServerError } from '../state/errors';
import { useMessages } from '../state/messages';

export default function Chat() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ with: string; floor?: string; name?: string; room?: string }>();
  const otherId = params.with;
  const floor = params.floor ? Number(params.floor) : null;
  const { session, registered } = useAuth();
  const { conversations, send, markRead } = useMessages();
  const convo = conversations.find((c) => c.otherId === otherId);
  const messages = convo?.messages ?? [];
  const name = convo?.name ?? params.name ?? '';
  const room = convo?.room ?? params.room ?? null;

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  // Opening the conversation marks what they sent as read.
  const unread = convo?.unread ?? 0;
  useEffect(() => {
    if (unread > 0) markRead(otherId).catch(() => {});
  }, [unread, otherId, markRead]);

  const submit = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await send(otherId, trimmed, floor);
      setText('');
    } catch (e) {
      setError(errorText(t, e instanceof ServerError ? e.code : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const presets = [t('presetSwap'), t('presetWhen'), t('presetTell')];

  if (!registered) {
    return (
      <View style={styles.page}>
        <Muted>{t('messagesNeedKey')}</Muted>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <View style={styles.head}>
        <Text style={styles.title} numberOfLines={1}>
          {holderLabel(name, room)}
        </Text>
        {floor && <Muted>{t('chatAboutFloor', { floor })}</Muted>}
      </View>

      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.thread}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && <Muted style={styles.empty}>{t('chatEmpty')}</Muted>}
        {messages.map((m) => {
          const mine = m.sender_id === session?.user.id;
          return (
            <View key={m.id} style={[styles.bubbleRow, mine && styles.mineRow]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={[styles.body, mine && styles.mineText]}>{m.body}</Text>
              </View>
              <Text style={styles.meta}>
                {formatClock(new Date(m.created_at))}
                {mine && m.read_at ? ` · ${t('seen')}` : ''}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.composer}>
        {messages.length === 0 && (
          <View style={styles.presets}>
            {presets.map((p) => (
              <Pressable
                key={p}
                onPress={() => submit(p)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.preset, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.presetText}>{p}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('messagePlaceholder')}
            placeholderTextColor={colors.faint}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => submit(text)}
            maxLength={500}
            multiline
            submitBehavior="submit"
            accessibilityLabel={t('messagePlaceholder')}
          />
          <Pressable
            onPress={() => submit(text)}
            disabled={!text.trim() || busy}
            accessibilityRole="button"
            accessibilityLabel={t('send')}
            style={({ pressed }) => [styles.send, (!text.trim() || busy) && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.sendText}>{t('send')}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 24 },
  head: { paddingHorizontal: 20, paddingBottom: 12, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: font.light, color: colors.text, letterSpacing: -0.4 },
  thread: { padding: 20, gap: 12 },
  empty: { textAlign: 'center', marginTop: 24 },
  bubbleRow: { alignItems: 'flex-start', gap: 4, maxWidth: '82%' },
  mineRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  theirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  mine: { backgroundColor: colors.text, borderBottomRightRadius: 6 },
  body: { fontSize: 15, lineHeight: 21, color: colors.text },
  mineText: { color: colors.primaryText },
  meta: { fontSize: 11, color: colors.faint, fontVariant: ['tabular-nums'] },
  composer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 10, borderTopWidth: 1, borderTopColor: colors.border },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card },
  presetText: { fontSize: 14, color: colors.text },
  error: { color: colors.danger, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  send: { height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: colors.primaryText, fontSize: 15, fontWeight: font.medium },
});

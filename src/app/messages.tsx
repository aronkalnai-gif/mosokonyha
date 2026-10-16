// All conversations, newest first.
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Muted } from '../components/ui';
import { useI18n } from '../lib/i18n';
import { holderLabel } from '../lib/machines';
import { colors, font, radius } from '../lib/theme';
import { formatClock } from '../lib/time';
import { useAuth } from '../state/auth';
import { useMessages } from '../state/messages';

export default function Messages() {
  const { t } = useI18n();
  const { session, registered } = useAuth();
  const { conversations } = useMessages();

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.title}>{t('messages')}</Text>

      {!registered ? (
        <Muted>{t('messagesNeedKey')}</Muted>
      ) : conversations.length === 0 ? (
        <Muted>{t('messagesEmpty')}</Muted>
      ) : (
        <View style={styles.list}>
          {conversations.map((c, i) => {
            const last = c.messages[c.messages.length - 1];
            const mine = last.sender_id === session?.user.id;
            return (
              <Pressable
                key={c.otherId}
                onPress={() => router.push({ pathname: '/chat', params: { with: c.otherId } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.item, i < conversations.length - 1 && styles.divider, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.itemBody}>
                  <View style={styles.itemTop}>
                    <Text style={[styles.name, c.unread > 0 && styles.unreadName]} numberOfLines={1}>
                      {holderLabel(c.name, c.room)}
                    </Text>
                    <Text style={styles.time}>{formatClock(new Date(last.created_at))}</Text>
                  </View>
                  <Text style={[styles.preview, c.unread > 0 && styles.unreadPreview]} numberOfLines={1}>
                    {mine ? `${t('youPrefix')}: ` : ''}
                    {last.body}
                  </Text>
                </View>
                {c.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{c.unread}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
      <Muted style={styles.note}>{t('messagesNote')}</Muted>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48, gap: 18 },
  title: { fontSize: 30, fontWeight: font.light, color: colors.text, letterSpacing: -0.6 },
  list: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemBody: { flex: 1, gap: 4, minWidth: 0 },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 15, color: colors.text },
  unreadName: { fontWeight: font.semibold },
  time: { fontSize: 12, color: colors.faint, fontVariant: ['tabular-nums'] },
  preview: { fontSize: 14, color: colors.muted },
  unreadPreview: { color: colors.text },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.primaryText, fontSize: 12, fontWeight: font.semibold },
  note: { fontSize: 12, textAlign: 'center' },
});

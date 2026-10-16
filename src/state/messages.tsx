import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { errorCode, Message, supabase } from '../lib/supabase';
import { useAuth } from './auth';
import { ServerError } from './errors';

/** One conversation with another person, newest message last. */
export type Conversation = {
  otherId: string;
  name: string;
  room: string | null;
  messages: Message[];
  unread: number;
};

type Messages = {
  conversations: Conversation[];
  unreadTotal: number;
  send: (to: string, body: string, floor?: number | null) => Promise<void>;
  markRead: (otherId: string) => Promise<void>;
};

const MessagesContext = createContext<Messages | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { session, registered } = useAuth();
  const me = session?.user.id;
  const [messages, setMessages] = useState<Message[]>([]);

  const refresh = useCallback(async () => {
    if (!me || !registered) return setMessages([]);
    const { data } = await supabase.from('messages').select('*').order('created_at');
    if (data) setMessages(data);
  }, [me, registered]);

  useEffect(() => {
    refresh();
    if (!me || !registered) return;
    // New messages and read receipts arrive live (row-level security only
    // delivers our own conversations).
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as Message;
        if (!row?.id) return;
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === row.id);
          if (i === -1) return [...prev, row];
          const next = [...prev];
          next[i] = row;
          return next;
        });
      })
      .subscribe();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      sub.remove();
      supabase.removeChannel(channel);
    };
  }, [me, registered, refresh]);

  const conversations = useMemo(() => {
    const byOther = new Map<string, Conversation>();
    for (const m of messages) {
      const mine = m.sender_id === me;
      const otherId = mine ? m.recipient_id : m.sender_id;
      const c = byOther.get(otherId) ?? {
        otherId,
        name: mine ? m.recipient_name : m.sender_name,
        room: mine ? m.recipient_room : m.sender_room,
        messages: [],
        unread: 0,
      };
      c.messages.push(m);
      if (!mine && !m.read_at) c.unread++;
      byOther.set(otherId, c);
    }
    // Most recent conversation first.
    return [...byOther.values()].sort((a, b) =>
      b.messages[b.messages.length - 1].created_at.localeCompare(a.messages[a.messages.length - 1].created_at),
    );
  }, [messages, me]);

  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);

  const send = useCallback<Messages['send']>(async (to, body, floor) => {
    const { data, error } = await supabase.rpc('send_message', { p_recipient: to, p_body: body, p_floor: floor ?? null });
    if (error) throw new ServerError(errorCode(error));
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  }, []);

  const markRead = useCallback(
    async (otherId: string) => {
      if (!me) return;
      const unread = messages.some((m) => m.sender_id === otherId && m.recipient_id === me && !m.read_at);
      if (!unread) return;
      const now = new Date().toISOString();
      setMessages((prev) => prev.map((m) => (m.sender_id === otherId && m.recipient_id === me && !m.read_at ? { ...m, read_at: now } : m)));
      await supabase.from('messages').update({ read_at: now }).eq('sender_id', otherId).eq('recipient_id', me).is('read_at', null);
    },
    [me, messages],
  );

  return (
    <MessagesContext.Provider value={{ conversations, unreadTotal, send, markRead }}>{children}</MessagesContext.Provider>
  );
}

export function useMessages(): Messages {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages outside MessagesProvider');
  return ctx;
}

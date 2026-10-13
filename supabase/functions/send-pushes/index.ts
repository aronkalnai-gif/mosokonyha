// Sends the due notifications from private.push_outbox as Web Push messages.
// Called every 15 seconds by pg_cron (private.kick_push_sender), only when
// something is due. See README for the required secrets.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

type Due = { endpoint: string; p256dh: string; auth: string; title: string; body: string; url: string; tag: string };

const env = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
};

webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${env('CRON_SECRET')}`) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data, error } = await supabase.rpc('claim_due_pushes');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let gone = 0;
  await Promise.all(
    (data as Due[]).map(async (m) => {
      try {
        await webpush.sendNotification(
          { endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } },
          JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag }),
          { TTL: 30 * 60, urgency: 'high' },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // The browser unsubscribed or the subscription expired.
        if (status === 404 || status === 410) {
          gone++;
          await supabase.rpc('delete_push_subscription', { p_endpoint: m.endpoint });
        } else {
          console.error('Push failed', status, e);
        }
      }
    }),
  );

  return Response.json({ sent, gone });
});

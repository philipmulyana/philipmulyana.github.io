import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigin = 'https://philipmulyana.com';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=60, s-maxage=60' : 'no-store',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'GET') return json(405, { error: 'method_not_allowed' });

  const origin = request.headers.get('origin');
  if (origin && origin !== allowedOrigin) return json(403, { error: 'origin_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(503, { error: 'unavailable' });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc('get_dana_kuliah_purchase_stats');
  if (error) return json(503, { error: 'unavailable' });

  const row = Array.isArray(data) && data[0] ? data[0] : {};
  const paidCount = Number(row.paid_count_7d ?? 0);
  const latestPurchaseAt = typeof row.latest_purchase_at === 'string'
    ? row.latest_purchase_at
    : null;

  return json(200, {
    paid_count_7d: Number.isSafeInteger(paidCount) && paidCount >= 0 ? paidCount : 0,
    latest_purchase_at: latestPurchaseAt,
  });
});

import { createClient } from 'npm:@supabase/supabase-js@2';
import { callMayarReadTool } from '../_shared/mcp-sse.ts';
import {
  extractMcpJson,
  normalizeMayarWebhook,
  verifyPaidDanaKuliahTransaction,
} from '../_shared/mayar.ts';

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function sameSecret(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }
  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const webhookSecret = Deno.env.get('MAYAR_WEBHOOK_SECRET') ?? '';
  const suppliedSecret = new URL(request.url).searchParams.get('token') ?? '';
  if (!webhookSecret || !suppliedSecret || !(await sameSecret(suppliedSecret, webhookSecret))) {
    return json(401, { error: 'unauthorized' });
  }

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > 32_768) return json(413, { error: 'payload_too_large' });

  try {
    const body = await request.text();
    if (body.length > 32_768) return json(413, { error: 'payload_too_large' });
    const webhook = normalizeMayarWebhook(JSON.parse(body));

    const mcpAuthorization = Deno.env.get('MAYAR_MCP_AUTHORIZATION') ?? '';
    if (!mcpAuthorization) return json(503, { error: 'verification_unavailable' });

    const mcpMessage = await callMayarReadTool(
      mcpAuthorization,
      'get_payment_detail',
      { uuId: webhook.transactionId },
    );
    const verified = verifyPaidDanaKuliahTransaction(webhook, extractMcpJson(mcpMessage));

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) return json(503, { error: 'storage_unavailable' });

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from('mayar_verified_payments').insert({
      transaction_id: verified.transactionId,
      product_id: verified.productId,
      amount: verified.amount,
      payment_status: verified.paymentStatus,
      paid_at: verified.paidAt,
      verified_at: new Date().toISOString(),
    });
    if (error && error.code !== '23505') return json(503, { error: 'storage_failed' });

    return json(200, { ok: true });
  } catch {
    return json(422, { error: 'verification_failed' });
  }
});

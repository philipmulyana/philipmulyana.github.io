export const DANA_KULIAH = Object.freeze({
  productId: 'c06b0cd6-1e96-4f3f-b9b1-9e041410bac8',
  productName: 'MULAI SIAPKAN DANA KULIAH ANAK KAMU DALAM 30 MENIT',
  productType: 'course',
  slug: 'dana-kuliah',
  amount: 149000,
});

type JsonObject = Record<string, unknown>;

export type NormalizedMayarWebhook = {
  transactionId: string;
  productId: string;
  productName: string;
  productType: string;
  transactionStatus: string;
  amount: number;
  updatedAt: string;
};

export type VerifiedPayment = {
  transactionId: string;
  productId: string;
  amount: number;
  paymentStatus: 'paid';
  paidAt: string;
};

function object(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonObject;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function amount(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error(`${label} must be an integer`);
  }
  return value;
}

function isoTimestamp(value: unknown, label: string): string {
  const milliseconds = typeof value === 'number' ? value : Date.parse(text(value, label));
  if (!Number.isFinite(milliseconds)) throw new Error(`${label} is invalid`);
  return new Date(milliseconds).toISOString();
}

export function normalizeMayarWebhook(payload: unknown): NormalizedMayarWebhook {
  const root = object(payload, 'payload');
  if (root.event !== 'payment.received') throw new Error('unsupported event');

  const data = object(root.data, 'data');
  const normalized: NormalizedMayarWebhook = {
    transactionId: text(data.transactionId, 'data.transactionId'),
    productId: text(data.productId, 'data.productId'),
    productName: text(data.productName, 'data.productName'),
    productType: text(data.productType, 'data.productType'),
    transactionStatus: text(data.transactionStatus, 'data.transactionStatus').toLowerCase(),
    amount: amount(data.amount, 'data.amount'),
    updatedAt: isoTimestamp(data.updatedAt, 'data.updatedAt'),
  };

  if (normalized.productId !== DANA_KULIAH.productId) throw new Error('wrong product');
  if (normalized.productType.toLowerCase() !== DANA_KULIAH.productType) throw new Error('wrong product type');
  if (normalized.transactionStatus !== 'paid') throw new Error('payment is not paid');
  if (normalized.amount !== DANA_KULIAH.amount) throw new Error('wrong amount');
  return normalized;
}

export function extractMcpJson(message: unknown): JsonObject {
  const root = object(message, 'MCP message');
  const result = object(root.result, 'MCP result');
  if (!Array.isArray(result.content)) throw new Error('MCP content is missing');
  const part = result.content.find((item) => {
    return item && typeof item === 'object' && (item as JsonObject).type === 'text';
  }) as JsonObject | undefined;
  if (!part || typeof part.text !== 'string') throw new Error('MCP text result is missing');
  const parsed = JSON.parse(part.text);
  return object(parsed, 'MCP JSON result');
}

export function verifyPaidDanaKuliahTransaction(
  webhook: NormalizedMayarWebhook,
  readbackPayload: unknown,
): VerifiedPayment {
  const root = object(readbackPayload, 'readback');
  if (root.statusCode !== 200) throw new Error('Mayar readback failed');
  const data = object(root.data, 'readback.data');
  const paymentLink = object(data.paymentLink, 'readback.data.paymentLink');

  const transactionId = text(data.id, 'readback.data.id');
  const status = text(data.status, 'readback.data.status').toLowerCase();
  const readbackAmount = amount(data.amount, 'readback.data.amount');
  const linkAmount = amount(paymentLink.amount, 'readback.data.paymentLink.amount');
  const linkId = text(paymentLink.id, 'readback.data.paymentLink.id');
  const link = text(paymentLink.link, 'readback.data.paymentLink.link');
  const type = text(paymentLink.type, 'readback.data.paymentLink.type').toLowerCase();

  if (transactionId !== webhook.transactionId) throw new Error('transaction mismatch');
  if (status !== 'paid') throw new Error('readback is not paid');
  if (readbackAmount !== DANA_KULIAH.amount || linkAmount !== DANA_KULIAH.amount) {
    throw new Error('readback amount mismatch');
  }
  if (
    linkId !== DANA_KULIAH.productId ||
    link !== DANA_KULIAH.slug ||
    type !== DANA_KULIAH.productType
  ) {
    throw new Error('readback product mismatch');
  }

  return {
    transactionId,
    productId: DANA_KULIAH.productId,
    amount: DANA_KULIAH.amount,
    paymentStatus: 'paid',
    paidAt: isoTimestamp(data.updatedAt, 'readback.data.updatedAt'),
  };
}

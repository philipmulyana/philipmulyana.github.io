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

export type MayarCustomerLookup = {
  customerName: string;
  customerEmail: string;
};

export type VerifiedAccess = {
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

function webhookData(payload: unknown): JsonObject {
  const root = object(payload, 'payload');
  if (root.event !== 'payment.received') throw new Error('unsupported event');
  return object(root.data, 'data');
}

export function normalizeMayarWebhook(payload: unknown): NormalizedMayarWebhook {
  const data = webhookData(payload);
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
  if (!['paid', 'settled'].includes(normalized.transactionStatus)) throw new Error('transaction is not complete');
  if (normalized.amount < 0) throw new Error('amount cannot be negative');
  return normalized;
}

export function extractMayarCustomerLookup(payload: unknown): MayarCustomerLookup {
  const data = webhookData(payload);
  return {
    customerName: text(data.customerName, 'data.customerName'),
    customerEmail: text(data.customerEmail, 'data.customerEmail'),
  };
}

export function extractMcpJson(message: unknown): JsonObject {
  const root = object(message, 'MCP message');
  const result = object(root.result, 'MCP result');
  if (!Array.isArray(result.content)) throw new Error('MCP content is missing');
  const part = result.content.find((item) => {
    return item && typeof item === 'object' && (item as JsonObject).type === 'text';
  }) as JsonObject | undefined;
  if (!part || typeof part.text !== 'string') throw new Error('MCP text result is missing');
  return object(JSON.parse(part.text), 'MCP JSON result');
}

function findTransaction(value: unknown, transactionId: string): JsonObject | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTransaction(item, transactionId);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const item = value as JsonObject;
  if (
    (item.id === transactionId || item.transactionId === transactionId)
    && 'status' in item
    && 'amount' in item
  ) return item;
  for (const child of Object.values(item)) {
    const found = findTransaction(child, transactionId);
    if (found) return found;
  }
  return null;
}

export function verifyDanaKuliahAccess(
  webhook: NormalizedMayarWebhook,
  readbackPayload: unknown,
): VerifiedAccess {
  const root = object(readbackPayload, 'readback');
  if (root.statusCode !== 200) throw new Error('Mayar readback failed');
  const transaction = findTransaction(root.data, webhook.transactionId);
  if (!transaction) throw new Error('transaction mismatch');

  const status = text(transaction.status, 'readback.transaction.status').toLowerCase();
  const readbackAmount = amount(transaction.amount, 'readback.transaction.amount');
  const paymentLink = transaction.paymentLink && typeof transaction.paymentLink === 'object'
    ? transaction.paymentLink as JsonObject
    : {};
  const linkId = text(
    transaction.paymentLinkId ?? paymentLink.id,
    'readback.transaction.paymentLinkId',
  );
  const type = text(
    transaction.balanceHistoryType,
    'readback.transaction.balanceHistoryType',
  ).toLowerCase();

  if (!['paid', 'settled'].includes(status)) throw new Error('readback transaction is not complete');
  if (readbackAmount !== webhook.amount) throw new Error('readback amount mismatch');
  if (readbackAmount < 0) throw new Error('readback amount cannot be negative');
  if (linkId !== DANA_KULIAH.productId || type !== DANA_KULIAH.productType) {
    throw new Error('readback product mismatch');
  }
  const canonicalTransactionId = text(
    transaction.transactionId,
    'readback.transaction.transactionId',
  );

  return {
    transactionId: canonicalTransactionId,
    productId: DANA_KULIAH.productId,
    amount: readbackAmount,
    paymentStatus: 'paid',
    paidAt: isoTimestamp(
      transaction.updatedAt ?? transaction.createdAt,
      'readback.transaction.timestamp',
    ),
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DANA_KULIAH,
  extractMcpJson,
  normalizeMayarWebhook,
  verifyPaidDanaKuliahTransaction,
} from '../supabase/functions/_shared/mayar.ts';

const TRANSACTION_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function validWebhook(overrides = {}) {
  return {
    event: 'payment.received',
    data: {
      id: TRANSACTION_ID,
      transactionId: TRANSACTION_ID,
      productId: DANA_KULIAH.productId,
      productName: DANA_KULIAH.productName,
      productType: 'course',
      transactionStatus: 'paid',
      status: 'SUCCESS',
      amount: DANA_KULIAH.amount,
      updatedAt: '2026-09-16T08:00:00.000Z',
      customerName: 'MUST NOT BE PERSISTED',
      customerEmail: 'private@example.com',
      ...overrides,
    },
  };
}

function validReadback(overrides = {}) {
  return {
    statusCode: 200,
    data: {
      id: TRANSACTION_ID,
      amount: DANA_KULIAH.amount,
      status: 'paid',
      updatedAt: Date.parse('2026-09-16T08:01:00.000Z'),
      paymentLink: {
        id: DANA_KULIAH.productId,
        amount: DANA_KULIAH.amount,
        link: DANA_KULIAH.slug,
        type: 'course',
      },
      ...overrides,
    },
  };
}

test('normalizes only the minimum non-PII purchase fields', () => {
  const normalized = normalizeMayarWebhook(validWebhook());
  assert.deepEqual(Object.keys(normalized).sort(), [
    'amount', 'productId', 'productName', 'productType', 'transactionId',
    'transactionStatus', 'updatedAt',
  ]);
  assert.equal(JSON.stringify(normalized).includes('private@example.com'), false);
});

test('rejects wrong event, product, status, amount, or transaction identifier', () => {
  const invalidPayloads = [
    { ...validWebhook(), event: 'payment.created' },
    validWebhook({ productId: 'wrong-product' }),
    validWebhook({ transactionStatus: 'unpaid' }),
    validWebhook({ amount: 1 }),
    validWebhook({ transactionId: '' }),
  ];
  for (const payload of invalidPayloads) {
    assert.throws(() => normalizeMayarWebhook(payload));
  }
});

test('accepts only a matching paid transaction returned by Mayar readback', () => {
  const verified = verifyPaidDanaKuliahTransaction(
    normalizeMayarWebhook(validWebhook()),
    validReadback(),
  );
  assert.deepEqual(verified, {
    transactionId: TRANSACTION_ID,
    productId: DANA_KULIAH.productId,
    amount: DANA_KULIAH.amount,
    paymentStatus: 'paid',
    paidAt: '2026-09-16T08:01:00.000Z',
  });
});

test('fails closed when readback does not match payment truth', () => {
  const webhook = normalizeMayarWebhook(validWebhook());
  const invalidReadbacks = [
    validReadback({ id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }),
    validReadback({ status: 'unpaid' }),
    validReadback({ amount: 149001 }),
    validReadback({ paymentLink: { ...validReadback().data.paymentLink, link: 'other-product' } }),
    validReadback({ paymentLink: { ...validReadback().data.paymentLink, id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' } }),
    { statusCode: 404, data: null },
  ];
  for (const readback of invalidReadbacks) {
    assert.throws(() => verifyPaidDanaKuliahTransaction(webhook, readback));
  }
});

test('extracts JSON from a standard MCP tool text result and rejects malformed output', () => {
  const wrapped = {
    result: {
      content: [{ type: 'text', text: JSON.stringify(validReadback()) }],
    },
  };
  assert.deepEqual(extractMcpJson(wrapped), validReadback());
  assert.throws(() => extractMcpJson({ result: { content: [] } }));
  assert.throws(() => extractMcpJson({ result: { content: [{ type: 'text', text: 'not-json' }] } }));
});

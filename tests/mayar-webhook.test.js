import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DANA_KULIAH,
  extractMayarCustomerLookup,
  extractMcpJson,
  normalizeMayarWebhook,
  verifyDanaKuliahAccess,
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
      customerName: 'Approved QA Customer',
      customerEmail: 'private@example.com',
      ...overrides,
    },
  };
}

function validReadback(overrides = {}) {
  return {
    statusCode: 200,
    data: [{
      id: 'ledger-entry-id',
      transactionId: TRANSACTION_ID,
      amount: DANA_KULIAH.amount,
      status: 'settled',
      createdAt: Date.parse('2026-09-16T08:01:00.000Z'),
      paymentLinkId: DANA_KULIAH.productId,
      balanceHistoryType: 'course',
      ...overrides,
    }],
  };
}

test('normalizes only the minimum non-PII access fields', () => {
  const normalized = normalizeMayarWebhook(validWebhook());
  assert.deepEqual(Object.keys(normalized).sort(), [
    'amount', 'productId', 'productName', 'productType', 'transactionId',
    'transactionStatus', 'updatedAt',
  ]);
  assert.equal(JSON.stringify(normalized).includes('private@example.com'), false);
});

test('extracts customer lookup only for authoritative Mayar readback', () => {
  assert.deepEqual(extractMayarCustomerLookup(validWebhook()), {
    customerName: 'Approved QA Customer',
    customerEmail: 'private@example.com',
  });
});

test('accepts a zero-value voucher event for the exact completed Dana Kuliah access', () => {
  const normalized = normalizeMayarWebhook(validWebhook({ amount: 0 }));
  const verified = verifyDanaKuliahAccess(
    normalized,
    validReadback({ amount: 0, paymentMethod: 'Gratis' }),
  );
  assert.deepEqual(verified, {
    transactionId: TRANSACTION_ID,
    productId: DANA_KULIAH.productId,
    amount: 0,
    paymentStatus: 'paid',
    paidAt: '2026-09-16T08:01:00.000Z',
  });
});

test('accepts a paid Dana Kuliah transaction', () => {
  const verified = verifyDanaKuliahAccess(
    normalizeMayarWebhook(validWebhook()),
    validReadback(),
  );
  assert.equal(verified.amount, DANA_KULIAH.amount);
});

test('rejects wrong event, product, unfinished status, negative amount, or transaction identifier', () => {
  const invalidPayloads = [
    { ...validWebhook(), event: 'payment.created' },
    validWebhook({ productId: 'wrong-product' }),
    validWebhook({ transactionStatus: 'unpaid' }),
    validWebhook({ amount: -1 }),
    validWebhook({ transactionId: '' }),
  ];
  for (const payload of invalidPayloads) {
    assert.throws(() => normalizeMayarWebhook(payload));
  }
});

test('fails closed when Mayar readback does not match transaction truth', () => {
  const webhook = normalizeMayarWebhook(validWebhook());
  const invalidReadbacks = [
    validReadback({ transactionId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }),
    validReadback({ status: 'pending' }),
    validReadback({ amount: 0 }),
    validReadback({ paymentLinkId: 'ffffffff-ffff-4fff-8fff-ffffffffffff' }),
    validReadback({ balanceHistoryType: 'membership' }),
    { statusCode: 404, data: [] },
  ];
  for (const readback of invalidReadbacks) {
    assert.throws(() => verifyDanaKuliahAccess(webhook, readback));
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

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  QUESTIONS,
  DIMENSIONS,
  categoryForScore,
  evaluate,
} = require('../js/risk-profile-engine.js');

function answersByScore(target) {
  return Object.fromEntries(
    QUESTIONS.map((question) => {
      const exact = question.options.find((option) => option.score === target && !option.uncertain);
      assert.ok(exact, `Missing score ${target} option for ${question.id}`);
      return [question.id, exact.value];
    })
  );
}

test('questionnaire covers four distinct dimensions with fifteen questions', () => {
  assert.equal(QUESTIONS.length, 15);
  assert.deepEqual(Object.keys(DIMENSIONS), ['willingness', 'capacity', 'horizon', 'knowledge']);

  const counts = QUESTIONS.reduce((out, question) => {
    out[question.dimension] = (out[question.dimension] || 0) + 1;
    return out;
  }, {});

  assert.deepEqual(counts, {
    willingness: 4,
    capacity: 4,
    horizon: 4,
    knowledge: 3,
  });
});

test('category boundaries are stable and inclusive', () => {
  assert.equal(categoryForScore(0).id, 'sangat-hati-hati');
  assert.equal(categoryForScore(24).id, 'sangat-hati-hati');
  assert.equal(categoryForScore(25).id, 'hati-hati');
  assert.equal(categoryForScore(44).id, 'hati-hati');
  assert.equal(categoryForScore(45).id, 'seimbang');
  assert.equal(categoryForScore(64).id, 'seimbang');
  assert.equal(categoryForScore(65).id, 'bertumbuh');
  assert.equal(categoryForScore(84).id, 'bertumbuh');
  assert.equal(categoryForScore(85).id, 'dinamis');
  assert.equal(categoryForScore(100).id, 'dinamis');
});

test('lowest answers produce a complete very cautious profile', () => {
  const result = evaluate(answersByScore(1));
  assert.equal(result.complete, true);
  assert.equal(result.score, 0);
  assert.equal(result.category.id, 'sangat-hati-hati');
  assert.equal(result.confidence.id, 'baik');
});

test('highest answers produce a complete dynamic profile', () => {
  const result = evaluate(answersByScore(5));
  assert.equal(result.complete, true);
  assert.equal(result.score, 100);
  assert.equal(result.category.id, 'dinamis');
});

test('capacity and horizon constrain willingness rather than being averaged away', () => {
  const answers = answersByScore(5);
  QUESTIONS.filter((q) => q.dimension === 'capacity' || q.dimension === 'horizon')
    .forEach((q) => { answers[q.id] = q.options.find((o) => o.score === 1).value; });

  const result = evaluate(answers);
  assert.equal(result.complete, true);
  assert.ok(result.rawScore > result.score);
  assert.ok(result.score <= 15);
  assert.equal(result.category.id, 'sangat-hati-hati');
  assert.ok(result.flags.some((flag) => flag.id === 'willingness-exceeds-capacity'));
  assert.ok(result.flags.some((flag) => flag.id === 'willingness-exceeds-horizon'));
});

test('uncertain answers remain visible and lower confidence', () => {
  const answers = answersByScore(3);
  const uncertainQuestions = QUESTIONS.filter((q) => q.options.some((o) => o.uncertain)).slice(0, 3);
  uncertainQuestions.forEach((q) => {
    answers[q.id] = q.options.find((o) => o.uncertain).value;
  });

  const result = evaluate(answers);
  assert.equal(result.complete, true);
  assert.equal(result.uncertainCount, 3);
  assert.equal(result.confidence.id, 'terbatas');
  assert.equal(result.uncertainQuestionIds.length, 3);
});

test('missing answers do not silently become zero', () => {
  const answers = answersByScore(3);
  delete answers[QUESTIONS[0].id];

  const result = evaluate(answers);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingQuestionIds, [QUESTIONS[0].id]);
  assert.equal(result.score, null);
  assert.equal(result.category, null);
});

test('limited knowledge is flagged when indicated risk is high', () => {
  const answers = answersByScore(5);
  QUESTIONS.filter((q) => q.dimension === 'knowledge')
    .forEach((q) => { answers[q.id] = q.options.find((o) => o.score === 1).value; });

  const result = evaluate(answers);
  assert.ok(result.flags.some((flag) => flag.id === 'knowledge-gap'));
});

test('every category provides educational investment-type guidance', () => {
  const { CATEGORIES } = require('../js/risk-profile-engine.js');
  for (const category of CATEGORIES) {
    assert.ok(Array.isArray(category.investmentTypes));
    assert.ok(category.investmentTypes.length >= 3, `${category.id} needs at least three investment types`);
    for (const item of category.investmentTypes) {
      assert.ok(item.name);
      assert.ok(item.why);
      assert.ok(item.watch);
    }
  }
});

test('investment guidance follows the constrained effective profile', () => {
  const answers = answersByScore(5);
  QUESTIONS.filter((q) => q.dimension === 'capacity' || q.dimension === 'horizon')
    .forEach((q) => { answers[q.id] = q.options.find((o) => o.score === 1).value; });

  const result = evaluate(answers);
  assert.equal(result.category.id, 'sangat-hati-hati');
  assert.deepEqual(result.investmentTypes, result.category.investmentTypes);
  assert.ok(result.investmentTypes.some((item) => /deposito|pasar uang/i.test(item.name)));
});

test('investment guidance names instrument classes without brands or buy commands', () => {
  const serialized = JSON.stringify(evaluate(answersByScore(5))).toLowerCase();
  for (const forbidden of ['beli sekarang', 'pasti cocok', 'dijamin', 'bibit', 'bareksa', 'ajaib', 'stockbit']) {
    assert.equal(serialized.includes(forbidden), false, `Found forbidden promotional language: ${forbidden}`);
  }
});

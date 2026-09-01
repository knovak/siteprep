import assert from 'node:assert/strict';
import test from 'node:test';
import {canonicalJson, CanonicalError, contentIdentity, parseJsonStrict} from '../src/canonical.mjs';

test('canonical identity ignores object insertion order and normalizes signed zero', () => {
  const left = {z: -0, a: {second: 2, first: 1}};
  const right = {a: {first: 1, second: 2}, z: 0};
  assert.equal(canonicalJson(left), '{"a":{"first":1,"second":2},"z":0}');
  assert.equal(contentIdentity(left), contentIdentity(right));
  assert.match(contentIdentity(left), /^sha256:[0-9a-f]{64}$/);
});

test('strict JSON parsing refuses duplicate object members before JSON.parse loses them', () => {
  assert.throws(() => parseJsonStrict('{"scope":{"id":1,"id":2}}'), (error) => {
    assert.equal(error.code, 'json.duplicate_key');
    assert.equal(error.path, '$.scope.id');
    return true;
  });
  assert.deepEqual(parseJsonStrict('{"a":[true,null,-1.5e2]}'), {a: [true, null, -150]});
});

test('canonical identity refuses non-portable values and cycles', () => {
  assert.throws(() => canonicalJson({value: Number.NaN}), (error) => {
    assert.equal(error.code, 'canonical.non_finite');
    return true;
  });
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => canonicalJson(cycle), CanonicalError);
});

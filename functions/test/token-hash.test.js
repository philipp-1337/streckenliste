const test = require("node:test");
const assert = require("node:assert/strict");

const {hashToken, MIN_TOKEN_LENGTH} = require("../lib/internal/tokenHash");

test("hashToken ist stabil und hexadezimal", () => {
  const a = hashToken("some-fcm-token-value");
  assert.equal(a, hashToken("some-fcm-token-value"));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("hashToken unterscheidet verschiedene Tokens", () => {
  assert.notEqual(hashToken("token-a"), hashToken("token-b"));
});

test("MIN_TOKEN_LENGTH ist gesetzt", () => {
  assert.equal(MIN_TOKEN_LENGTH, 32);
});

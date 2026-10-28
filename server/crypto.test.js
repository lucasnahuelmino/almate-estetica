import test from "node:test";
import assert from "node:assert/strict";
import { decryptSecret, encryptSecret } from "./crypto.js";

const key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("encrypts refresh tokens and decrypts them only with the same key", () => {
  const token = "sensitive-refresh-token";
  const encrypted = encryptSecret(token, key);
  assert.notEqual(encrypted, token);
  assert.equal(decryptSecret(encrypted, key), token);
  assert.throws(() => decryptSecret(encrypted, `${key.slice(2)}00`));
});

test("rejects malformed encrypted values", () => {
  assert.throws(() => decryptSecret("not-a-token", key));
});

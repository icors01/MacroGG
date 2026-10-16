import test from 'node:test';
import assert from 'node:assert/strict';
import { requestPasswordReset, PASSWORD_RESET_MESSAGE } from '../src/utils/passwordReset.js';

test('requests a Firebase reset link for the trimmed email without modifying the account', async () => {
  const auth = { currentUser: null };
  const calls = [];
  const message = await requestPasswordReset(auth, '  user@example.com  ', async (...args) => calls.push(args));
  assert.deepEqual(calls, [[auth, 'user@example.com']]);
  assert.equal(message, PASSWORD_RESET_MESSAGE);
  assert.equal(auth.currentUser, null);
});

test('unknown accounts receive the same confirmation as existing accounts', async () => {
  const message = await requestPasswordReset({}, 'unknown@example.com', async () => {
    throw { code: 'auth/user-not-found' };
  });
  assert.equal(message, PASSWORD_RESET_MESSAGE);
});

test('blank email does not send a request', async () => {
  let called = false;
  await assert.rejects(requestPasswordReset({}, '  ', async () => { called = true; }), /Enter your account email/);
  assert.equal(called, false);
});

for (const [code, message] of [
  ['auth/invalid-email', /valid email address/],
  ['auth/too-many-requests', /Too many reset requests/],
  ['auth/network-request-failed', /Check your internet connection/],
  ['auth/internal-error', /Unable to send a reset link/],
]) {
  test(`reports ${code} without claiming the email was sent`, async () => {
    await assert.rejects(requestPasswordReset({}, 'user@example.com', async () => {
      throw { code };
    }), message);
  });
}

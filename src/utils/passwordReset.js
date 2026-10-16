import { sendPasswordResetEmail } from 'firebase/auth';

export const PASSWORD_RESET_MESSAGE =
  'If an account exists for that email, you will receive a password reset link. Check your inbox and spam folder.';

export async function requestPasswordReset(auth, email, sendResetEmail = sendPasswordResetEmail) {
  const address = email.trim();
  if (!address) throw new Error('Enter your account email address.');

  try {
    // Firebase's hosted action page verifies the expiring link and updates the
    // existing Auth account. No password or reset code belongs in Firestore.
    await sendResetEmail(auth, address);
  } catch (error) {
    switch (error.code) {
      case 'auth/user-not-found':
        // Use the same response whether email enumeration protection is on or off.
        break;
      case 'auth/invalid-email':
        throw new Error('Enter a valid email address.');
      case 'auth/too-many-requests':
        throw new Error('Too many reset requests. Please wait a few minutes and try again.');
      case 'auth/network-request-failed':
        throw new Error('Could not connect. Check your internet connection and try again.');
      default:
        throw new Error('Unable to send a reset link right now. Please try again later.');
    }
  }

  return PASSWORD_RESET_MESSAGE;
}

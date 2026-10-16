import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db, appId } from '../../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Modal } from '../ui/Modal';
import { Loader2, LogIn, UserPlus, Mail, Shield, Key } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose, onShowError, allowClickOutside = false, primaryColor = '#22c55e', onShowSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSettingNewPassword, setIsSettingNewPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [loading, setLoading] = useState(false);

  const sendPasswordResetCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const code = generateVerificationCode();
      setSentCode(code);
      
      // Store the reset code in Firestore temporarily (expires in 10 minutes)
      const resetDoc = doc(db, `artifacts/${appId}/password_resets/${email.replace(/[.#$[\]]/g, '_')}`);
      await setDoc(resetDoc, {
        code: code,
        email: email,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      // Send email using EmailJS
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_mi80wf4',
          template_id: 'template_wl9dyrb',
          user_id: 'tqkBQnWQ6VE7SKplj',
          template_params: {
            email: email,
            to_name: email.split('@')[0],
            verification_code: code
          }
        })
      });

      if (emailResponse.ok) {
        setIsResettingPassword(true);
        setIsForgotPassword(false);
        if (onShowSuccess) {
          onShowSuccess(`Password reset code sent to ${email}! Please check your inbox.`);
        } else {
          onShowError(`Password reset code sent to ${email}! Please check your inbox.`, 'success');
        }
      } else {
        const errorData = await emailResponse.text();
        console.error('EmailJS error response:', errorData);
        throw new Error(`Failed to send reset email: ${errorData}`);
      }
    } catch (error) {
      onShowError('Failed to send password reset code. Please try again.');
      console.error('Password reset email error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyResetCode = async (e) => {
    e.preventDefault();
    if (verificationCode !== sentCode) {
      onShowError('Invalid verification code. Please try again.');
      return;
    }

    // Code verified - move to password creation screen
    setIsResettingPassword(false);
    setIsSettingNewPassword(true);
    setVerificationCode('');
  };

  const resetPasswordWithNewPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      onShowError('Passwords do not match. Please try again.');
      return;
    }

    if (newPassword.length < 6) {
      onShowError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Store the new password temporarily in Firestore
      const resetDoc = doc(db, `artifacts/${appId}/password_resets/${email.replace(/[.#$[\]]/g, '_')}`);
      await setDoc(resetDoc, {
        email: email,
        newPassword: newPassword,
        resetAt: new Date().toISOString()
      });
      
      onClose();
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setSentCode('');
      setIsSettingNewPassword(false);
      
      if (onShowSuccess) {
        onShowSuccess('Password has been updated! You can now sign in with your new password.');
      } else {
        onShowError('Password has been updated! You can now sign in with your new password.', 'success');
      }
    } catch (error) {
      onShowError('Failed to update password. Please try again.');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendVerificationCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const code = generateVerificationCode();
      setSentCode(code);
      
      // Store the code in Firestore temporarily (expires in 10 minutes)
      const verificationDoc = doc(db, `artifacts/${appId}/verifications/${email.replace(/[.#$[\]]/g, '_')}`);
      await setDoc(verificationDoc, {
        code: code,
        email: email,
        username: username,
        password: password,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });

      // Send email using EmailJS
      const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: 'service_mi80wf4',
          template_id: 'template_wl9dyrb',
          user_id: 'tqkBQnWQ6VE7SKplj',
          template_params: {
            email: email,
            to_name: username,
            verification_code: code
          }
        })
      });

      if (emailResponse.ok) {
        setIsVerifyingCode(true);
        if (onShowSuccess) {
          onShowSuccess(`Verification code sent to ${email}! Please check your inbox.`);
        } else {
          onShowError(`Verification code sent to ${email}! Please check your inbox.`, 'success');
        }
      } else {
        const errorData = await emailResponse.text();
        console.error('EmailJS error response:', errorData);
        throw new Error(`Failed to send verification email: ${errorData}`);
      }
    } catch (error) {
      onShowError('Failed to send verification code. Please try again.');
      console.error('Verification email error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCodeAndCreateAccount = async (e) => {
    e.preventDefault();
    if (verificationCode !== sentCode) {
      onShowError('Invalid verification code. Please try again.');
      return;
    }

    setLoading(true);
    try {
      // Upgrade the guest account in place so its meals keep the same user ID.
      const userCredential = auth.currentUser?.isAnonymous
        ? await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password))
        : await createUserWithEmailAndPassword(auth, email, password);
      // Save username to Firestore
      const userDoc = doc(db, `artifacts/${appId}/users/${userCredential.user.uid}/settings/preferences`);
      await setDoc(userDoc, { username: username.trim() }, { merge: true });
      
      // Close modal on success
      onClose();
      setEmail('');
      setPassword('');
      setUsername('');
      setVerificationCode('');
      setSentCode('');
      setIsVerifyingCode(false);
      if (onShowSuccess) {
        onShowSuccess('Account created successfully!');
      } else {
        onShowError('Account created successfully!', 'success');
      }
    } catch (error) {
      let message = 'An unknown authentication error occurred.';
      if (error.code) {
        message = error.code.replace('auth/', '').replace(/-/g, ' ');
      }
      
      if (error.code === 'auth/operation-not-allowed') {
        message = "Sign-in Failed: This account method (Email/Password) is disabled in the project settings. Please use the platform's default sign-in to save data."
      }
      
      onShowError(`Authentication Failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if there's a password reset for this email
      const resetDoc = doc(db, `artifacts/${appId}/password_resets/${email.replace(/[.#$[\]]/g, '_')}`);
      const resetSnap = await getDoc(resetDoc);
      
      if (resetSnap.exists()) {
        const resetData = resetSnap.data();
        // Try signing in with the new password
        try {
          await signInWithEmailAndPassword(auth, email, resetData.newPassword);
          onClose();
          setEmail('');
          setPassword('');
          return;
        } catch {
          // New password didn't work, continue with normal login
        }
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
      setEmail('');
      setPassword('');
    } catch (error) {
      let message = 'An unknown authentication error occurred.';
      if (error.code) {
        message = error.code.replace('auth/', '').replace(/-/g, ' ');
      }
      
      if (error.code === 'auth/operation-not-allowed') {
        message = "Sign-in Failed: This account method (Email/Password) is disabled in the project settings. Please use the platform's default sign-in to save data."
      }
      
      onShowError(`Authentication Failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <Modal isOpen={isOpen} title="Reset Password" onClose={onClose} allowClickOutside={allowClickOutside} titleColor="#3b82f6">
        <form onSubmit={sendPasswordResetCode} className="space-y-4 text-gray-200">
          <p className="text-sm text-gray-400">Enter your email address and we'll send you a verification code.</p>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
              placeholder="user@example.com"
            />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:bg-gray-500"
            style={{ backgroundColor: loading ? undefined : primaryColor }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mail size={18} />
            )}
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsForgotPassword(false);
            setEmail('');
          }}
          className="w-full text-sm mt-4 text-blue-400 hover:text-blue-300 transition-colors"
        >
          Back to Sign In
        </button>
      </Modal>
    );
  }

  // Password Reset - Enter verification code
  if (isResettingPassword) {
    return (
      <Modal isOpen={isOpen} title="Verify Your Email" onClose={onClose} allowClickOutside={false} titleColor="#3b82f6">
        <form onSubmit={verifyResetCode} className="space-y-4 text-gray-200">
          <p className="text-sm text-gray-400">Enter the verification code sent to <span className="text-blue-400">{email}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="verify-code">Verification Code</label>
            <input
              id="verify-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500 text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:bg-gray-500"
            style={{ backgroundColor: loading ? undefined : primaryColor }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Shield size={18} />
            )}
            Verify Code
          </button>
        </form>

        <button
          onClick={() => {
            setIsResettingPassword(false);
            setVerificationCode('');
            setSentCode('');
            setIsForgotPassword(true);
          }}
          className="w-full text-sm mt-4 text-blue-400 hover:text-blue-300 transition-colors"
        >
          Back to Password Reset
        </button>
      </Modal>
    );
  }

  // Set New Password - After verification
  if (isSettingNewPassword) {
    return (
      <Modal isOpen={isOpen} title="Create New Password" onClose={onClose} allowClickOutside={false} titleColor="#3b82f6">
        <form onSubmit={resetPasswordWithNewPassword} className="space-y-4 text-gray-200">
          <p className="text-sm text-gray-400">Enter your new password for <span className="text-blue-400">{email}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
              placeholder="New password (6+ characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
              placeholder="Confirm new password"
            />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:bg-gray-500"
            style={{ backgroundColor: loading ? undefined : primaryColor }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Key size={18} />
            )}
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </Modal>
    );
  }

  // Verification Code View (for sign up only)
  if (isVerifyingCode) {
    return (
      <Modal isOpen={isOpen} title="Verify Email" onClose={onClose} allowClickOutside={false} titleColor="#3b82f6">
        <form onSubmit={verifyCodeAndCreateAccount} className="space-y-4 text-gray-200">
          <p className="text-sm text-gray-400">Enter the 6-digit verification code sent to <span className="text-blue-400">{email}</span></p>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="verify-code">Verification Code</label>
            <input
              id="verify-code"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500 text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:bg-gray-500"
            style={{ backgroundColor: loading ? undefined : primaryColor }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Shield size={18} />
            )}
            {loading ? 'Creating Account...' : 'Verify & Create Account'}
          </button>
        </form>

        <button
          onClick={() => {
            setIsVerifyingCode(false);
            setVerificationCode('');
            setSentCode('');
          }}
          className="w-full text-sm mt-4 text-blue-400 hover:text-blue-300 transition-colors"
        >
          Back to Sign Up
        </button>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} title={isLogin ? "Sign In" : "Sign Up"} onClose={onClose} allowClickOutside={false} titleColor="#3b82f6">
      <form onSubmit={isLogin ? handleAuth : sendVerificationCode} className="space-y-4 text-gray-200">
        {!isLogin && (
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="auth-username">Name</label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isLogin}
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
              placeholder="Your display name"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
            placeholder="Must be 6+ characters"
          />
          {isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>
        <button
          type="submit"
          className="w-full text-white font-semibold py-2 rounded-lg transition-opacity flex items-center justify-center gap-2 disabled:bg-gray-500"
          style={{ backgroundColor: loading ? undefined : primaryColor }}
          onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isLogin ? (
            <LogIn size={18} />
          ) : (
            <UserPlus size={18} />
          )}
          {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="w-full text-sm mt-4 text-blue-400 hover:text-blue-300 transition-colors"
      >
        {isLogin ? "Need an account? Sign up." : "Already have an account? Sign in."}
      </button>
    </Modal>
  );
};

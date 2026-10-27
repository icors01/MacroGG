import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db, appId } from "../../config/firebase";
import { doc, setDoc } from "firebase/firestore";
import { requestPasswordReset } from "../../utils/passwordReset";
import { Modal } from "../ui/Modal";
import { Loader2, LogIn, UserPlus, Mail } from "lucide-react";

export const AuthModal = ({
  isOpen,
  onClose,
  onShowError,
  allowClickOutside = false,
  primaryColor = "#22c55e",
  onShowSuccess,
}) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const message = await requestPasswordReset(auth, email);
      setPassword("");
      setIsForgotPassword(false);
      setIsLogin(true);
      if (onShowSuccess) {
        onShowSuccess(message);
      } else {
        onShowError(message, "success");
      }
    } catch (error) {
      onShowError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      // Upgrade the guest account in place so its meals keep the same user ID.
      const userCredential = auth.currentUser?.isAnonymous
        ? await linkWithCredential(
            auth.currentUser,
            EmailAuthProvider.credential(email, password),
          )
        : await createUserWithEmailAndPassword(auth, email, password);
      // Save username to Firestore
      const userDoc = doc(
        db,
        `artifacts/${appId}/users/${userCredential.user.uid}/settings/preferences`,
      );
      await setDoc(userDoc, { username: username.trim() }, { merge: true });

      // Firebase verifies ownership on its hosted page, never in browser state.
      let verificationSent = true;
      try { await sendEmailVerification(userCredential.user); }
      catch { verificationSent = false; }
      // Close modal on success
      onClose();
      setEmail("");
      setPassword("");
      setUsername("");
      if (onShowSuccess) {
        onShowSuccess(verificationSent
          ? "Account created. Check your email for a verification link."
          : "Account created, but the verification email could not be sent. You can still sign in.");
      } else {
        onShowError(verificationSent
          ? "Account created. Check your email for a verification link."
          : "Account created, but the verification email could not be sent. You can still sign in.", "success");
      }
    } catch (error) {
      let message = "An unknown authentication error occurred.";
      if (error.code) {
        message = error.code.replace("auth/", "").replace(/-/g, " ");
      }

      if (error.code === "auth/operation-not-allowed") {
        message =
          "Sign-in Failed: This account method (Email/Password) is disabled in the project settings. Please use the platform's default sign-in to save data.";
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
      await signInWithEmailAndPassword(auth, email, password);
      onClose();
      setEmail("");
      setPassword("");
    } catch (error) {
      let message = "An unknown authentication error occurred.";
      if (error.code) {
        message = error.code.replace("auth/", "").replace(/-/g, " ");
      }

      if (error.code === "auth/operation-not-allowed") {
        message =
          "Sign-in Failed: This account method (Email/Password) is disabled in the project settings. Please use the platform's default sign-in to save data.";
      }

      onShowError(`Authentication Failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (isForgotPassword) {
    return (
      <Modal
        isOpen={isOpen}
        title="Reset password"
        onClose={onClose}
        allowClickOutside={allowClickOutside}
        titleColor="#3b82f6"
      >
        <form
          onSubmit={handlePasswordReset}
          className="space-y-4 text-gray-200"
        >
          <p className="text-sm text-gray-400">
            Enter your account email address. If an account exists, you'll
            receive a link to choose a new password.
          </p>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="reset-email"
            >
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
              placeholder="user@example.com"
            />
          </div>
          <button
            type="submit"
            className="button button-primary w-full disabled:bg-gray-500"
            style={{ backgroundColor: loading ? undefined : primaryColor }}
            onMouseEnter={(e) =>
              !loading && (e.currentTarget.style.opacity = "0.8")
            }
            onMouseLeave={(e) =>
              !loading && (e.currentTarget.style.opacity = "1")
            }
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mail size={18} />
            )}
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <button
          onClick={() => {
            setIsForgotPassword(false);
            setEmail("");
          }}
          className="w-full text-sm mt-4 dialog-link transition-colors"
        >
          Back to sign in
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      title={isLogin ? "Sign in" : "Sign up"}
      onClose={onClose}
      allowClickOutside={false}
      titleColor="#3b82f6"
    >
      <form
        onSubmit={isLogin ? handleAuth : createAccount}
        className="space-y-4 text-gray-200"
      >
        {!isLogin && (
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="auth-username"
            >
              Name
            </label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isLogin}
              className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
              placeholder="Your display name"
            />
          </div>
        )}
        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="auth-email"
          >
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="auth-password"
          >
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"
            placeholder="Must be 6+ characters"
          />
          {isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-xs dialog-link mt-1 transition-colors"
            >
              Forgot password?
            </button>
          )}
        </div>
        <button
          type="submit"
          className="button button-primary w-full disabled:bg-gray-500"
          style={{ backgroundColor: loading ? undefined : primaryColor }}
          onMouseEnter={(e) =>
            !loading && (e.currentTarget.style.opacity = "0.8")
          }
          onMouseLeave={(e) =>
            !loading && (e.currentTarget.style.opacity = "1")
          }
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isLogin ? (
            <LogIn size={18} />
          ) : (
            <UserPlus size={18} />
          )}
          {loading ? "Processing..." : isLogin ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        className="w-full text-sm mt-4 dialog-link transition-colors"
      >
        {isLogin
          ? "Need an account? Sign up."
          : "Already have an account? Sign in."}
      </button>
    </Modal>
  );
};

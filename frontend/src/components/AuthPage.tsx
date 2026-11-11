import { ArrowLeft, ArrowRight, Check, Layers3, LockKeyhole, Sparkles } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/useAuth";

export default function AuthPage({ initialMode }: { initialMode?: string }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const mode = params.mode || initialMode || "login";
  const signup = mode === "signup";
  const passwordRecovery = mode === "reset-password";
  const googleAuthEnabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";
  const navigate = useNavigate();
  const { configured, loading, recoveryMode, user, signIn, signInWithGoogle, signUp, startPhoneVerification, resendPhoneVerification, verifyPhone, resetPassword, updatePassword, signOut } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerificationRequired, setPhoneVerificationRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const resumedVerification = useRef("");

  useEffect(() => {
    if (searchParams.get("verifyPhone") !== "1" || !user) return;
    const pendingPhone = user.user_metadata.phone_number;
    if (typeof pendingPhone !== "string" || pendingPhone === user.phone) return;
    const verificationKey = `${user.id}:${pendingPhone}`;
    if (resumedVerification.current === verificationKey) return;
    resumedVerification.current = verificationKey;
    setPhone(pendingPhone);
    setPhoneVerificationRequired(true);
    setSubmitting(true);
    void startPhoneVerification(pendingPhone)
      .then(() => toast.success("Check your phone for a verification code."))
      .catch((verificationError: unknown) => setError(verificationError instanceof Error ? verificationError.message : "Unable to send a phone verification code."))
      .finally(() => setSubmitting(false));
  }, [searchParams, startPhoneVerification, user]);

  async function continueWithGoogle() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "";
      setError(message.includes("Unsupported provider")
        ? "Google sign-in is not enabled for this app yet. Use email or phone sign-in, or contact the app administrator."
        : message || "Google sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (signup) {
        const normalizedPhone = phone.replace(/[\s().-]/g, "");
        if (normalizedPhone && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
          setError("Enter your phone number in international format, including the country code (for example, +14155552671).");
          setSubmitting(false);
          return;
        }
        const hasSession = await signUp(email.trim().toLowerCase(), password, name.trim(), normalizedPhone);
        if (!hasSession) {
          toast.success("Account created. Check your email to confirm it, then sign in.");
          navigate("/login", { replace: true });
          return;
        }
        if (!normalizedPhone) {
          toast.success("Your account is ready. Welcome to Canvas.");
          navigate("/", { replace: true });
          return;
        }
        await startPhoneVerification(normalizedPhone);
        setPhone(normalizedPhone);
        setPhoneVerificationRequired(true);
        toast.success("Check your phone for a verification code.");
        return;
      } else {
        const identifier = email.trim();
        if (!identifier.includes("@")) {
          const normalizedPhone = identifier.replace(/[\s().-]/g, "");
          if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
            setError("Enter your email or a verified phone number in international format, such as +14155552671.");
            return;
          }
        }
        const normalizedIdentifier = identifier.includes("@")
          ? identifier.toLowerCase()
          : identifier.replace(/[\s().-]/g, "");
        const { phoneToVerify } = await signIn(normalizedIdentifier, password);
        if (phoneToVerify) {
          await startPhoneVerification(phoneToVerify);
          setPhone(phoneToVerify);
          setPhoneVerificationRequired(true);
          toast.success("Verify your phone number to finish securing your account.");
          return;
        }
        toast.success("Welcome back.");
      }
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPhoneCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await verifyPhone(phone, phoneCode.trim());
      toast.success("Phone number verified. Welcome to Canvas.");
      navigate("/", { replace: true });
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "Phone verification failed. Check the code and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    setError("");
    setSubmitting(true);
    try {
      await resendPhoneVerification(phone);
      toast.success("A new verification code has been sent.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Unable to resend the verification code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOutAndUseAnotherAccount() {
    setError("");
    setSubmitting(true);
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Unable to sign out.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendResetEmail() {
    setError("");
    setSubmitting(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setResetSent(true);
      toast.success("If that account exists, a password-reset email is on its way.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to request a password reset.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      toast.success("Your password has been updated.");
      navigate("/", { replace: true });
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Unable to update your password. Request a new reset link and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page auth-page-split">
      <section className="auth-story" aria-label="About Canvas">
        <Link className="auth-brand" to="/">
          <span className="auth-brand-mark"><Sparkles size={18} /></span>
          <span>canvas<span className="brand-period">.</span></span>
        </Link>
        <div className="auth-story-content">
          <span className="auth-story-label"><span /> YOUR AI WEBSITE STUDIO</span>
          <h1>Big ideas deserve a beautiful place to live.</h1>
          <p>Turn a simple description into a website you can shape, refine, and make your own.</p>
          <div className="auth-benefits">
            <div><span><Check size={14} /></span><p><strong>Start with a prompt</strong><small>Bring your next idea to life in seconds.</small></p></div>
            <div><span><Layers3 size={14} /></span><p><strong>Make it yours</strong><small>Edit every section in a live preview.</small></p></div>
            <div><span><ArrowUpRightIcon /></span><p><strong>Take it with you</strong><small>Export your site when it is ready.</small></p></div>
          </div>
          <div className="auth-mini-preview" aria-hidden="true">
            <div className="auth-mini-top"><span /><span /><span /><i>YOUR NEXT BIG IDEA</i><b>canvas.</b></div>
            <div className="auth-mini-content"><span>MADE FOR WHAT COMES NEXT</span><strong>Make something<br />remarkable.</strong><i /><div><b /><b /><b /></div></div>
          </div>
        </div>
        <div className="auth-story-footer"><span>DESIGNED FOR THE WAY YOU THINK</span><span>01 — 03</span></div>
      </section>

      <section className="auth-panel">
        <header className="auth-panel-header">
          <span>{signup ? "Already have an account?" : "New to Canvas?"}</span>
          <Link to={signup || passwordRecovery ? "/login" : "/signup"}>{signup || passwordRecovery ? "Log in" : "Create account"} <ArrowRight size={14} /></Link>
        </header>
        <div className="auth-card">
          <span className="auth-card-kicker">{passwordRecovery ? "ACCOUNT SECURITY" : signup ? "GET STARTED FOR FREE" : "WELCOME BACK"}</span>
          <h2>{phoneVerificationRequired ? "Verify your phone" : passwordRecovery ? "Choose a new password" : signup ? "Create your account" : "Sign in to Canvas"}</h2>
          <p className="auth-card-description">{phoneVerificationRequired ? `Enter the SMS code sent to ${phone}.` : passwordRecovery ? "Choose a strong password to secure your account and return to your workspace." : signup ? "Save your projects and pick up where inspiration leaves off." : "Your next great website is right where you left it."}</p>
        {!configured && (import.meta.env.PROD
          ? <div className="auth-error" role="alert">
            Authentication is not configured for this deployment. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to the frontend build, plus <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to the backend host. Configure an SMS provider in Supabase to enable phone verification.
          </div>
          : <div className="guest-auth-notice">
            <strong>Real account sign-in is not configured</strong>
            <p>Email accounts and verified phone login need a Supabase project and an SMS provider. This workspace has no project credentials yet.</p>
            <ol>
              <li><a href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer">Create or open your Supabase project</a>.</li>
              <li>Enable email and phone sign-in, and configure an SMS provider in Auth settings.</li>
              <li>Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>frontend/.env.local</code>.</li>
              <li>Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>backend/.env</code>, then restart the app.</li>
            </ol>
            <p className="guest-auth-security">Keep the service-role key server-side. Never share keys or passwords in chat.</p>
            <Link className="auth-submit guest-continue" to="/">Continue with a guest workspace <ArrowRight size={16} /></Link>
          </div>
        )}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {passwordRecovery && configured && loading && <p className="auth-card-description" role="status">Verifying your password-reset link…</p>}
        {passwordRecovery && configured && !loading && !recoveryMode && <div className="auth-error" role="alert">This password-reset link is invalid or has expired. <Link to="/login">Return to sign in</Link> and request a new one.</div>}
        {passwordRecovery && configured && !loading && recoveryMode && <form onSubmit={(event) => void submitNewPassword(event)}>
          <label>New password<input required type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" disabled={submitting} /></label>
          <label>Confirm new password<input required type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter your password again" disabled={submitting} /></label>
          <button className="auth-submit" type="submit" disabled={submitting || newPassword.length < 8 || confirmPassword.length < 8}>{submitting ? "Updating password…" : "Update password"} <ArrowRight size={16} /></button>
        </form>}
        {configured && phoneVerificationRequired && <>
          <div className="phone-verify-note"><LockKeyhole size={17} /><span>Phone verification protects your account and enables phone-number sign-in.</span></div>
          <form onSubmit={(event) => void submitPhoneCode(event)}>
            <label>SMS verification code<input required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={phoneCode} onChange={(event) => setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit code" disabled={submitting} /></label>
            <button className="auth-submit" type="submit" disabled={submitting || phoneCode.length !== 6}>{submitting ? "Verifying…" : "Verify phone number"} <ArrowRight size={16} /></button>
            <button className="auth-secondary-action" type="button" disabled={submitting} onClick={() => void resendCode()}>Resend verification code</button>
            <button className="auth-secondary-action" type="button" disabled={submitting} onClick={() => void signOutAndUseAnotherAccount()}>Sign out and use another account</button>
          </form>
        </>}
        {configured && !phoneVerificationRequired && !passwordRecovery && <>
          {googleAuthEnabled
            ? <button className="google-auth-button" type="button" disabled={submitting} onClick={() => void continueWithGoogle()}>
              <span className="google-auth-mark" aria-hidden="true">G</span>
              Continue with Google
            </button>
            : <p className="auth-provider-note">Google sign-in is being set up. You can use email and password now.</p>}
          <div className="auth-divider"><span>{signup ? "OR SIGN UP WITH EMAIL" : "OR CONTINUE WITH EMAIL OR PHONE"}</span></div>
          <form onSubmit={(event) => void submit(event)}>
            {signup && <label>Your name<input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Alex Morgan" disabled={!configured || submitting} /></label>}
            <label>{signup ? "Email address" : "Email or verified phone"}<input required type={signup ? "email" : "text"} autoComplete={signup ? "email" : "username"} inputMode={signup ? "email" : "text"} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={signup ? "you@example.com" : "you@example.com or +14155552671"} disabled={!configured || submitting} /></label>
            {signup && <label>Phone number (optional)<input type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 415 555 2671" aria-describedby="phone-number-help" disabled={!configured || submitting} /><span id="phone-number-help" className="auth-field-help">Add a number to verify it by SMS. You can also sign up with email only.</span></label>}
            <label>Password<input required type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={signup ? "Create a password (8+ characters)" : "Enter your password"} disabled={!configured || submitting} /></label>
            {!signup && <button className="forgot-link" type="button" disabled={!configured || submitting || !email.includes("@") || resetSent} onClick={() => void sendResetEmail()}>{submitting ? "Sending reset link…" : "Reset password"}</button>}
            {resetSent && <p className="auth-success" role="status">If an account matches that email, use the password reset link we sent to reset your password. Check your inbox and spam folder.</p>}
            <button className="auth-submit" type="submit" disabled={!configured || submitting || password.length === 0}>{submitting ? "Please wait…" : signup ? "Create account" : "Sign in"} <ArrowRight size={16} /></button>
          </form>
        </>}
          {configured && <p className="auth-secure-note"><span /> Your account is secured with Supabase authentication.</p>}
        </div>
        <footer className="auth-panel-footer"><Link to="/"><ArrowLeft size={13} /> Back to the studio</Link><span>Canvas AI Website Builder</span></footer>
      </section>
    </main>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={14} />;
}

import { t, useLocale } from "@/lib/i18n";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Laptop,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Brand } from "@/components/keyvault-ui";
import { LanguageSelector } from "@/components/language-selector";
import { login, verifyTOTP } from "@/lib/auth";
import { errorMessage } from "@/lib/inventory";
import "@/keyvault.css";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  useLocale();

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState("");
  const [code, setCode] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = pending ? await verifyTOTP(pending, code) : await login(email, password);
      if ("totp" in result) {
        setPending(result.totp.pending_token);
        return;
      }
      if (!["ADMIN", "EDITOR"].includes(result.user.role)) {
        setError(
          new Error(
            "This workspace is for inventory administrators and editors. Contact your administrator for access."
          )
        );
        return;
      }
      await navigate({ to: "/dashboard", search: { view: "overview" } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="kv kv-login">
      <aside className="kv-login-story">
        <Link to="/">
          <Brand />
        </Link>
        <div>
          <span className="kv-eyebrow">
            <Sparkles size={15} /> {t("YOUR IT. IN GOOD HANDS.")}
          </span>
          <h1>
            {t("A place for")}
            <br />
            {t("everything.")}
            <br />
            <span className="kv-serif">{t("Room to do more.")}</span>
          </h1>
          <p>
            {t("A clearer view of your inventory.")}
            <br />
            {t("A better day for your whole team.")}
          </p>
          <div className="kv-login-visual">
            <span className="kv-login-device">
              <Laptop size={68} strokeWidth={1.1} />
            </span>
            <span className="kv-login-check">
              <Check size={22} />
            </span>
            <div>
              <strong>{t("All the right connections.")}</strong>
              <span>{t("Devices + people + services")}</span>
            </div>
          </div>
        </div>
        <span className="kv-login-foot">
          <ShieldCheck size={16} /> {t("Your infrastructure. Your data. Your peace of mind.")}
        </span>
      </aside>
      <main className="kv-login-form-wrap">
        <div className="kv-login-language">
          <LanguageSelector />
        </div>
        <Link to="/" className="kv-back-link">
          <ArrowLeft size={16} /> {t("Back to home")}
        </Link>
        <div className="kv-login-form">
          <span className="kv-icon-tile violet">
            <LockKeyhole size={25} />
          </span>
          <span className="kv-overline">{t("YOUR WORKSPACE AWAITS")}</span>
          <h2>{pending ? t("One last check.") : t("Good to have you back.")}</h2>
          <p>
            {pending
              ? t("Enter the code from your authenticator app.")
              : t("Sign in and pick up right where you left off.")}
          </p>
          <form onSubmit={submit}>
            {pending ? (
              <label>
                {t("Authentication code")}
                <input
                  required
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                />
              </label>
            ) : (
              <>
                <label>
                  {t("Work email")}
                  <input
                    required
                    type="email"
                    autoComplete="username"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  <span>
                    {t("Password")} <Link to="/admin/forgot-password">{t("Forgot password?")}</Link>
                  </span>
                  <span className="kv-password">
                    <input
                      required
                      type={visible ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder={t("Enter your password")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={visible ? t("Hide password") : t("Show password")}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
              </>
            )}
            {error !== null && (
              <div className="kv-error" role="alert">
                {errorMessage(error)}
              </div>
            )}
            <button className="kv-button primary large" disabled={busy}>
              {busy ? (
                <Loader2 className="kv-spin" size={18} />
              ) : (
                <>
                  {" "}
                  {pending ? t("Verify & sign in") : t("Sign in to workspace")}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="kv-login-help">
            {t("Need a workspace account?")}
            <br />
            <strong>{t("Ask your IT administrator to invite you.")}</strong>
          </div>
          {import.meta.env.DEV && (
            <div className="kv-demo-note">
              <span>{t("LOCAL DEVELOPMENT")}</span>
              <p>{t("Explore with the seeded administrator.")}</p>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@example.com");
                  setPassword("admin123");
                }}
              >
                {t("Use demo credentials")} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
        <span className="kv-login-security">
          <LockKeyhole size={13} /> {t("A secure little home for your company IT.")}
        </span>
      </main>
    </div>
  );
}

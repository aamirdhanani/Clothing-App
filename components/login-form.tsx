"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "sign-in" | "sign-up";

export function LoginForm() {
  const router = useRouter();
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(false);
    setMessage("");

    if (!client) {
      setError(true);
      setMessage("Account access is not configured yet.");
      setLoading(false);
      return;
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

    const action =
      mode === "sign-in"
        ? client.auth.signInWithPassword({ email, password })
        : client.auth.signUp({
            email,
            password,
            options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
          });

    const { data, error: authError } = await action;

    if (authError) {
      setError(true);
      setMessage(authError.message);
      setLoading(false);
      return;
    }

    if (mode === "sign-up" && !data.session) {
      setMessage("Check your email to confirm your account.");
      setLoading(false);
      return;
    }

    setMessage(mode === "sign-in" ? "Welcome back." : "Account created.");
    setLoading(false);
    router.push("/closet");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="auth-head">
        <h2 className="section-title display" style={{ margin: 0 }}>
          {mode === "sign-in" ? "Welcome back" : "Create account"}
        </h2>
        <p className="auth-copy">Access your private closet.</p>
      </div>

      <div className="auth-toggle" role="tablist" aria-label="Auth mode">
        <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>
          Sign in
        </button>
        <button type="button" className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>
          Create account
        </button>
      </div>

      <form className="stack auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="label">Email</span>
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
        </label>

        <label className="field">
          <span className="label">Password</span>
          <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="********" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required />
        </label>

        <button className="button button-primary" type="submit" disabled={loading}>
          {loading ? (
            <span className="button-loading"><span className="spinner" />Please wait</span>
          ) : mode === "sign-in" ? (
            "Continue"
          ) : (
            "Create account"
          )}
        </button>

        <p className={`message ${error ? "error" : "success"}`}>{message}</p>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error || "Sign in failed.");
      setPending(false);
      return;
    }
    window.location.assign("/");
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="brand-mark large">S</div>
        <p className="eyebrow">SOCIO</p>
        <h1>Your week, scheduled once.</h1>
        <p className="login-copy">
          Upload finished posters and captions, place them on the calendar, then
          let Socio publish through your existing SMMPRO connection.
        </p>
        <div className="login-benefits">
          <span>
            <CalendarDays size={18} /> One focused weekly calendar
          </span>
          <span>
            <CheckCircle2 size={18} /> Facebook and Instagram tracked separately
          </span>
          <span>
            <CheckCircle2 size={18} /> Failed targets retry without reposting
            successful ones
          </span>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div>
            <p className="eyebrow">WELCOME BACK</p>
            <h2>Sign in to Socio</h2>
            <p>Use the administrator login already configured in SMMPRO.</p>
          </div>
          <label>
            Email address
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="button primary wide" disabled={pending}>
            {pending ? "Connecting…" : "Continue"} <ArrowRight size={17} />
          </button>
          <p className="security-note">
            Meta access tokens stay inside SMMPRO. Socio stores only an
            encrypted, time-limited publisher session.
          </p>
        </form>
      </section>
    </main>
  );
}

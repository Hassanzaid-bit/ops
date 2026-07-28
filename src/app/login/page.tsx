"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Q Zone
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
            Field Ops
          </h1>
          <p className="text-sm text-[var(--ink-muted)]">
            Sign in with your email and password to continue.
          </p>
        </header>

        <form
          action={action}
          className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            {state?.errors?.email && (
              <p className="text-xs text-red-700">{state.errors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            {state?.errors?.password && (
              <p className="text-xs text-red-700">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.message && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] transition-opacity disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DEMO_USERS,
  ROLE_LABELS,
  getSession,
  setSession,
  type SessionUser,
} from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getSession()) {
      router.replace("/dashboard");
      return;
    }
    setChecking(false);
  }, [router]);

  function signIn(user: SessionUser) {
    setSession(user);
    router.replace("/dashboard");
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] text-[var(--ink-muted)]">
        Loading…
      </div>
    );
  }

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
            Sign in to continue. Demo accounts for the prototype — no password
            yet.
          </p>
        </header>

        <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]">
          {DEMO_USERS.map((user) => (
            <button
              key={user.email}
              type="button"
              onClick={() => signIn(user)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[var(--bg)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-ink)]">
                {user.name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--ink)]">
                  {user.name}
                </span>
                <span className="block text-xs text-[var(--ink-muted)]">
                  {ROLE_LABELS[user.role]} · {user.email}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

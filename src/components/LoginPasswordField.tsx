"use client";

import { PasswordField } from "@/components/PasswordField";

export function LoginPasswordField() {
  return (
    <PasswordField
      id="password"
      name="password"
      required
      autoComplete="current-password"
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] py-2.5 pl-3 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)]"
    />
  );
}

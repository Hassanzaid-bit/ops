"use client";

import { useState } from "react";

type PasswordFieldProps = {
  id?: string;
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
};

export function PasswordField({
  id,
  name,
  value,
  onChange,
  required,
  autoComplete,
  placeholder,
  className = inputClass,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const controlled = onChange !== undefined;

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        {...(controlled
          ? {
              value: value ?? "",
              onChange: (e) => onChange(e.target.value),
            }
          : {})}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--ink-muted)] transition-colors hover:bg-[var(--line)]/60 hover:text-[var(--ink)]"
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

function IconEye() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.84 18.84 0 0 1-4.35 5.06" />
      <path d="M6.06 6.06A18.84 18.84 0 0 0 2 12s3.5 7 10 7a10.94 10.94 0 0 0 2.76-.36" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

const inputClass =
  "min-h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]";

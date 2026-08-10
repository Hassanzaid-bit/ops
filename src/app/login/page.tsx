import Image from "next/image";
import { LoginPasswordField } from "@/components/LoginPasswordField";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Invalid email/username or password.",
  config:
    "Server auth is not configured. Set SESSION_SECRET and DATABASE_URL, then restart the app (or set them in Vercel and redeploy).",
  database:
    "Database is not configured. Set DATABASE_URL in .env (or Vercel) and restart.",
  session:
    "Session signing is not configured. Set SESSION_SECRET in .env (or Vercel) and restart.",
};

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-4 text-center">
          <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-2xl shadow-[var(--shadow)]">
            <Image
              src="/qzone-logo.png"
              alt="QZone Integrated Pest Management"
              width={576}
              height={224}
              priority
              className="h-auto w-full"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">
              Field Ops
            </h1>
            <p className="text-sm text-[var(--ink-muted)]">
              Sign in with your email or username and password.
            </p>
          </div>
        </header>

        <form
          action="/api/auth/login"
          method="POST"
          className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="login"
              className="block text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
            >
              Email or username
            </label>
            <input
              id="login"
              name="login"
              type="text"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wide text-[var(--ink-muted)]"
            >
              Password
            </label>
            <LoginPasswordField />
          </div>

          {message && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] transition-opacity"
          >
            Sign in
          </button>
        </form>

        {error === "invalid" && (
          <p className="text-center text-xs text-[var(--ink-muted)]">
            After a deploy, hard-refresh this page if sign-in keeps failing.
          </p>
        )}
      </div>
    </div>
  );
}

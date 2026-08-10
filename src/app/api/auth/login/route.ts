import { NextResponse } from "next/server";
import { z } from "zod";
import { homePath } from "@/lib/permissions";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/session";
import { toSessionUser, verifyUserPassword } from "@/lib/users";

const LoginFormSchema = z.object({
  login: z.string().trim().min(1, { error: "Email or username is required." }),
  password: z.string().min(1, { error: "Password is required." }),
});

function loginRedirect(request: Request, error?: string) {
  const url = new URL("/login", request.url);
  if (error) {
    url.searchParams.set("error", error);
  }
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const validatedFields = LoginFormSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return loginRedirect(request, "invalid");
  }

  const { login, password } = validatedFields.data;
  let dbUser;
  try {
    dbUser = await verifyUserPassword(login, password);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("DATABASE_URL")
    ) {
      return loginRedirect(request, "database");
    }
    throw error;
  }

  if (!dbUser) {
    return loginRedirect(request, "invalid");
  }

  const user = toSessionUser(dbUser);
  let sessionToken;
  try {
    sessionToken = await createSessionToken(user);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("SESSION_SECRET")
    ) {
      return loginRedirect(request, "session");
    }
    throw error;
  }

  const response = NextResponse.redirect(
    new URL(homePath(user.role), request.url),
    303,
  );
  response.cookies.set(
    SESSION_COOKIE,
    sessionToken.value,
    sessionCookieOptions(sessionToken.expiresAt),
  );
  return response;
}

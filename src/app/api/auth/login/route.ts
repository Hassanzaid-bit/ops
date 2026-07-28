import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/session";
import { findUserByEmail, toSessionUser } from "@/lib/users";

const LoginFormSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
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
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return loginRedirect(request, "invalid");
  }

  const { email, password } = validatedFields.data;
  const user = findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return loginRedirect(request, "invalid");
  }

  try {
    await createSession(toSessionUser(user));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("SESSION_SECRET")
    ) {
      return loginRedirect(request, "config");
    }
    throw error;
  }

  return NextResponse.redirect(new URL("/dashboard", request.url), 303);
}

"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSession, deleteSession } from "@/lib/session";
import { findUserByEmail, toSessionUser } from "@/lib/users";

const LoginFormSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z.string().min(1, { error: "Password is required." }),
});

export type LoginState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;
  const user = findUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { message: "Invalid email or password." };
  }

  await createSession(toSessionUser(user));
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

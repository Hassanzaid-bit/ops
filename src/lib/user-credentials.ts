const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function normalizeLogin(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function validateUsername(username: string): string {
  const normalized = normalizeUsername(username);
  if (!normalized) throw new Error("Username is required");
  if (!isValidUsername(normalized)) {
    throw new Error(
      "Username must be 3–32 characters: letters, numbers, dots, underscores, or hyphens",
    );
  }
  return normalized;
}

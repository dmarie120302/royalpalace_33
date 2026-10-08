// Accounts are identified by a username. Supabase Auth requires an email, so each
// username maps to an internal address on the app's own domain that never receives mail.
export const ACCESS_DOMAIN = "royalpalace33.vercel.app";
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const PIN_PATTERN = /^\d{6}$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (value: string) =>
  USERNAME_PATTERN.test(normalizeUsername(value));

export const isValidPin = (value: string) => PIN_PATTERN.test(value);

/** Accepts a username or, for legacy accounts, a full email address. */
export function loginEmail(value: string): string {
  const clean = normalizeUsername(value);
  return clean.includes("@") ? clean : `${clean}@${ACCESS_DOMAIN}`;
}

export function usernameToEmail(value: string): string {
  const clean = normalizeUsername(value);
  return clean ? `${clean}@${ACCESS_DOMAIN}` : "";
}

/** Shows the username for internal addresses and the full address otherwise. */
export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  const suffix = `@${ACCESS_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}

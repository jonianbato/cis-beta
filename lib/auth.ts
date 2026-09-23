/** Shape the login route expects back on failure. */
type LoginErrorBody = { message?: string };

/**
 * Posts credentials to this app's login route.
 *
 * Throws on failure — LoginForm renders a rejected promise's message inline,
 * so the Error message here is what the user reads.
 */
export async function signIn(
  username: string,
  password: string,
  options: { remember: boolean },
): Promise<void> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Let the route issue the session cookie.
    credentials: "same-origin",
    body: JSON.stringify({ username, password, remember: options.remember }),
  });

  if (!response.ok) {
    let message = "Unable to sign in. Please try again.";
    try {
      const body = (await response.json()) as LoginErrorBody;
      if (body.message) message = body.message;
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    throw new Error(message);
  }
}

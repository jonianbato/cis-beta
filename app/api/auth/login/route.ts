import { NextResponse } from "next/server";

/**
 * Credential sign-in — NOT IMPLEMENTED.
 *
 * TODO: verify the credentials against the CIS identity provider and set the
 * session cookie the rest of the app reads. Everything up to this point (the
 * form, validation, error surfacing, redirect) is wired and working; this
 * route is deliberately the only gap, so nothing here pretends to
 * authenticate anyone.
 *
 * Sign-out already has a counterpart convention in the kit:
 * DEFAULT_SIGN_OUT_PATH is "/api/auth/logout".
 */
export async function POST() {
  return NextResponse.json(
    { message: "Sign-in is not connected to an identity provider yet." },
    { status: 501 },
  );
}

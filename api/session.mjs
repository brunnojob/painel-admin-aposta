import {
  ApiError,
  bodyObject,
  configuration,
  sendError,
} from "../lib/supabase.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method !== "POST") throw new ApiError(405, "method_not_allowed");
    const body = bodyObject(req.body, 4096);
    if (
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 254 ||
      body.password.length > 256
    )
      throw new ApiError(400, "invalid_credentials");
    const signup = body.action === "signup";
    if (body.action !== undefined && body.action !== "login" && !signup)
      throw new ApiError(400, "invalid_action");
    if (signup && body.password.length < 12)
      throw new ApiError(400, "password_too_short");
    const { url, key } = configuration();
    const response = await fetch(
      `${url}/auth/v1/${signup ? "signup" : "token?grant_type=password"}`,
      {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: body.email, password: body.password }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      },
    );
    if (!response.ok)
      throw new ApiError(
        response.status === 429 ? 429 : 401,
        signup ? "registration_failed" : "login_failed",
      );
    const session = await response.json();
    return res
      .status(200)
      .json({
        accessToken: session.access_token ?? null,
        expiresAt: session.expires_at ?? null,
        confirmationRequired: signup && !session.access_token,
      });
  } catch (error) {
    return sendError(res, error);
  }
}

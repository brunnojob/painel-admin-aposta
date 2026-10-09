export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function configuration() {
  const url = globalThis.Netlify?.env.get("SUPABASE_URL") ?? process.env.SUPABASE_URL;
  const key = globalThis.Netlify?.env.get("SUPABASE_PUBLISHABLE_KEY") ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new ApiError(503, "database_not_configured");
  return { url: url.replace(/\/$/, ""), key };
}

export async function database(token, path, options = {}) {
  const { url, key } = configuration();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  if (!response.ok) {
    const status =
      data?.code === "23505" || data?.code === "P0001"
        ? 409
        : data?.code === "23514" || data?.code === "22P02"
          ? 400
          : response.status === 401 || response.status === 403
            ? response.status
            : 502;
    throw new ApiError(
      status,
      status === 409
        ? "state_or_idempotency_conflict"
        : status === 400
          ? "invalid_record"
          : status === 502
            ? "database_request_failed"
            : "unauthorized",
    );
  }
  return data;
}

export async function principal(req) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !/^Bearer [A-Za-z0-9_.-]+$/.test(header))
    throw new ApiError(401, "supabase_session_required");
  const token = header.slice(7);
  const { url, key } = configuration();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: header },
    signal: AbortSignal.timeout(10000),
    redirect: "error",
  });
  if (!response.ok) throw new ApiError(401, "invalid_or_expired_session");
  const user = await response.json();
  if (!user.id || user.is_anonymous)
    throw new ApiError(403, "registered_account_required");
  return { token, ownerId: user.id };
}

export function sendError(res, error) {
  res.setHeader("Cache-Control", "no-store");
  return res
    .status(error instanceof ApiError ? error.status : 502)
    .json({
      error: error instanceof ApiError ? error.message : "upstream_unavailable",
    });
}

export function bodyObject(value, maxBytes = 262144) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(400, "object_required");
  if (Buffer.byteLength(JSON.stringify(value)) > maxBytes)
    throw new ApiError(413, "payload_too_large");
  return value;
}

export function boundedInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max)
    throw new ApiError(400, "invalid_limit");
  return parsed;
}

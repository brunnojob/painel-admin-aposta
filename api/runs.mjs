import {
  ApiError,
  bodyObject,
  boundedInteger,
  database,
  principal,
  sendError,
} from "../lib/supabase.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!["GET", "POST"].includes(req.method)) {
      res.setHeader("Allow", "GET, POST");
      throw new ApiError(405, "method_not_allowed");
    }
    const { token } = await principal(req);
    if (req.method === "GET") {
      const project = req.query.project;
      if (
        typeof project !== "string" ||
        !/^[a-zA-Z0-9_.-]{1,100}$/.test(project)
      )
        throw new ApiError(400, "invalid_project");
      const limit = boundedInteger(req.query.limit, 50, 200);
      const rows = await database(
        token,
        `bd_runs?project_id=eq.${encodeURIComponent(project)}&order=created_at.desc&limit=${limit}`,
      );
      return res.status(200).json({ items: rows });
    }
    const body = bodyObject(req.body);
    if (
      typeof body.project !== "string" ||
      typeof body.clientKey !== "string" ||
      typeof body.kind !== "string" ||
      !/^[a-z][a-z0-9_.-]{0,63}$/.test(body.kind)
    )
      throw new ApiError(400, "invalid_run");
    bodyObject(body.result, 196608);
    const events = body.events ?? [];
    if (
      !Array.isArray(events) ||
      events.length > 500 ||
      events.some((e) => !e || typeof e !== "object" || Array.isArray(e))
    )
      throw new ApiError(400, "invalid_events");
    const id = await database(token, "rpc/bd_record_run", {
      method: "POST",
      body: JSON.stringify({
        p_project: body.project,
        p_client_key: body.clientKey,
        p_kind: body.kind,
        p_result: body.result,
        p_events: events,
      }),
    });
    return res.status(200).json({ id, clientKey: body.clientKey, persisted: true });
  } catch (error) {
    return sendError(res, error);
  }
}

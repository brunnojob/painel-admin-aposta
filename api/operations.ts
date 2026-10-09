import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ApiError,
  bodyObject,
  database,
  principal,
  sendError,
} from "../lib/supabase.mjs";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!["GET", "POST"].includes(req.method ?? ""))
      throw new ApiError(405, "method_not_allowed");
    const { token, ownerId } = await principal(req);
    if (req.method === "GET") {
      const [telemetry, workOrders] = await Promise.all([
        database(token, "bd_telemetry?order=event_at.desc&limit=100"),
        database(token, "bd_work_orders?order=created_at.desc&limit=100"),
      ]);
      return res.status(200).json({ telemetry, workOrders });
    }
    const body = bodyObject(req.body, 8192);
    if (body.action === "transition") {
      if (
        !Number.isSafeInteger(Number(body.id)) ||
        Number(body.id) < 1 ||
        !["acknowledged", "closed"].includes(body.status)
      )
        throw new ApiError(400, "invalid_transition");
      const prior = body.status === "acknowledged" ? "open" : "acknowledged";
      const rows = await database(
        token,
        `bd_work_orders?id=eq.${Number(body.id)}&status=eq.${prior}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: body.status }),
        },
      );
      if (!rows.length) throw new ApiError(409, "work_order_state_conflict");
      return res.status(200).json(rows[0]);
    }
    if (
      typeof body.assetTag !== "string" ||
      !/^[A-Z0-9_-]{1,32}$/.test(body.assetTag) ||
      typeof body.title !== "string" ||
      body.title.trim().length < 4 ||
      body.title.length > 160 ||
      !["low", "medium", "high", "critical"].includes(body.priority)
    )
      throw new ApiError(400, "invalid_work_order");
    const rows = await database(token, "bd_work_orders", {
      method: "POST",
      body: JSON.stringify({
        owner_id: ownerId,
        asset_tag: body.assetTag,
        title: body.title.trim(),
        priority: body.priority,
      }),
    });
    return res.status(201).json(rows[0]);
  } catch (error) {
    return sendError(res, error);
  }
}

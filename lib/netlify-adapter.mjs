const MAX_BODY = 262144;

async function body(request) {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw Object.assign(new Error("payload_too_large"), { status: 413 });
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) return undefined;
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw Object.assign(new Error("json_content_type_required"), { status: 415 });
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("invalid_json"), { status: 400 });
  }
}

export function adapt(handler) {
  return async (request) => {
    const headers = new Headers({ "Cache-Control": "no-store" });
    let status = 200;
    let response;
    const res = {
      setHeader(name, value) { headers.set(name, String(value)); return res; },
      status(value) { status = value; return res; },
      json(value) {
        headers.set("Content-Type", "application/json; charset=utf-8");
        response = new Response(JSON.stringify(value), { status, headers });
        return res;
      },
    };
    try {
      const url = new URL(request.url);
      const query = Object.create(null);
      for (const [name, value] of url.searchParams) {
        if (Object.hasOwn(query, name))
          throw Object.assign(new Error("duplicate_query_parameter"), { status: 400 });
        query[name] = value;
      }
      await handler({
        method: request.method,
        headers: Object.fromEntries(request.headers),
        query,
        body: await body(request),
      }, res);
      return response ?? Response.json({ error: "missing_handler_response" }, { status: 502, headers });
    } catch (error) {
      return Response.json({ error: error.status ? error.message : "upstream_unavailable" },
        { status: error.status ?? 502, headers });
    }
  };
}

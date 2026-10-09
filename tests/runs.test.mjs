import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/runs.mjs";

function response() {
  return {
    code: 0,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
}

test("rejects requests without a session before database access", async () => {
  const res = response();
  await handler(
    { method: "GET", headers: {}, query: { project: "c-household-budget" } },
    res,
  );
  assert.equal(res.code, 401);
});

test("rejects oversized results and never invokes the RPC", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public";
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ id: "owner" }), { status: 200 });
  };
  try {
    const res = response();
    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer a.b.c" },
        body: {
          project: "c-household-budget",
          clientKey: "one",
          kind: "report",
          result: { x: "a".repeat(270000) },
        },
      },
      res,
    );
    assert.equal(res.code, 413);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = previous;
  }
});

test("forwards the user JWT and maps the RPC persistence result", async () => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "public";
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify(url.includes("/auth/") ? { id: "owner" } : "run-id"),
      { status: 200 },
    );
  };
  try {
    const res = response();
    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer a.b.c" },
        body: {
          project: "c-household-budget",
          clientKey: "one",
          kind: "report",
          result: { totalMinor: 123 },
        },
      },
      res,
    );
    assert.equal(res.code, 200);
    assert.equal(res.data.id, "run-id");
    assert.equal(calls[1].options.headers.Authorization, "Bearer a.b.c");
    assert.equal(JSON.parse(calls[1].options.body).p_result.totalMinor, 123);
  } finally {
    globalThis.fetch = previous;
  }
});

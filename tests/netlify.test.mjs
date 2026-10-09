import test from "node:test";
import assert from "node:assert/strict";
import { adapt } from "../lib/netlify-adapter.mjs";

test("passes parsed input and preserves endpoint status and headers", async () => {
  const endpoint = adapt((req, res) => {
    assert.equal(req.headers.authorization, "Bearer session");
    assert.equal(req.query.project, "c-household-budget");
    assert.equal(req.body.result.value, 3);
    res.setHeader("X-Receipt", "one").status(201).json({ persisted: true, clientKey: "one" });
  });
  const response = await endpoint(new Request("https://lab.test/api/runs?project=c-household-budget", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer session" },
    body: JSON.stringify({ result: { value: 3 } }),
  }));
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("x-receipt"), "one");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).clientKey, "one");
});

test("rejects duplicated query parameters before calling the handler", async () => {
  const response = await adapt(() => { assert.fail("handler invoked"); })(
    new Request("https://lab.test/api/runs?project=one&project=two"));
  assert.equal(response.status, 400);
});

test("limits a streamed payload even without Content-Length", async () => {
  const request = new Request("https://lab.test/api/runs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: " ".repeat(262145),
  });
  const response = await adapt(() => { assert.fail("handler invoked"); })(request);
  assert.equal(response.status, 413);
});

test("invalid JSON and unsupported content types never reach domain logic", async () => {
  const endpoint = adapt(() => { assert.fail("handler invoked"); });
  for (const [contentType, expected] of [["application/json", 400], ["text/plain", 415]]) {
    const response = await endpoint(new Request("https://lab.test/api/runs", {
      method: "POST", headers: { "Content-Type": contentType }, body: "{bad",
    }));
    assert.equal(response.status, expected);
  }
});

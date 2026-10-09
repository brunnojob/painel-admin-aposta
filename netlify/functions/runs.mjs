import handler from "../../api/runs.mjs";
import { adapt } from "../../lib/netlify-adapter.mjs";

export default adapt(handler);
export const config = { path: "/api/runs" };

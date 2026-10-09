import handler from "../../api/operations.ts";
import { adapt } from "../../lib/netlify-adapter.mjs";

export default adapt(handler);
export const config = { path: "/api/operations" };

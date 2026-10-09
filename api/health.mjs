export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res
    .status(200)
    .json({
      service: "brunnodev-operations",
      version: 2,
      configured: Boolean(
        process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
      ),
      authentication: "supabase",
      persistence: "postgresql",
    });
}

import type { NextConfig } from "next";

// Uploads go browser → S3 directly now, so nothing large crosses a server
// action and the raised bodySizeLimit is gone. The 1 MB default stays as a
// tripwire: if a File ever leaks into a server action again, it fails loudly.
const nextConfig: NextConfig = {
  // Canva's OAuth redirect has to land on 127.0.0.1 (see app/canva/callback),
  // so the app is browsed there in dev. Without this, Next 16 answers its own
  // /_next dev assets with 403 for that host and nothing hydrates.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;

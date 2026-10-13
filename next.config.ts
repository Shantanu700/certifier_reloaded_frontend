import type { NextConfig } from "next";

// Uploads go browser → S3 directly now, so nothing large crosses a server
// action and the raised bodySizeLimit is gone. The 1 MB default stays as a
// tripwire: if a File ever leaks into a server action again, it fails loudly.
const nextConfig: NextConfig = {};

export default nextConfig;

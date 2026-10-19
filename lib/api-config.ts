import type { CreateClientConfig } from "@/src/client/client.gen";

/** The dev backend; set NEXT_PUBLIC_API_URL anywhere else. */
const DEV_API_URL = "https://localhost:8022";

/**
 * The generated client's start-up config (openapi-ts `runtimeConfigPath`). NEXT_PUBLIC_ because
 * the browser builds backend file links too (local-storage files have relative /media/ paths);
 * Next inlines it at build time, so a build is tied to the address it was built with.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.NEXT_PUBLIC_API_URL || DEV_API_URL,
});

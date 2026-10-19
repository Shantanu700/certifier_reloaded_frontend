export default {
  // The schema to generate from; the address the app calls comes from lib/api-config.ts at runtime.
  input: process.env.OPENAPI_INPUT ?? 'https://localhost:8022/api/schema/',
  output: 'src/client', // sign up at app.heyapi.dev
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    { name: '@hey-api/client-fetch', runtimeConfigPath: '@/lib/api-config' },
  ],
};

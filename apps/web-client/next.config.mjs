/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as raw TypeScript (main = src/index.ts),
  // so Next must transpile them.
  transpilePackages: ["@clever/fiscal-engine", "@clever/intuit-client"],
  // Keep server-only native/heavy packages out of the bundle (loaded at runtime).
  // (Renamed from experimental.serverComponentsExternalPackages in Next 15.)
  // bull (spawns child processes) and @anthropic-ai/sdk must not be bundled.
  serverExternalPackages: ["@prisma/client", "bcryptjs", "bull", "@anthropic-ai/sdk"],
};

export default nextConfig;

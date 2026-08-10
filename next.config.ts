import type { NextConfig } from "next";
import path from "node:path";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Keep workspace root at the project (cwd), not the compiled config path.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // Hide the Next.js “N” badge / bottom panel — it covers field-ops UI on mobile
  // and can stick open after the camera/gallery file picker closes.
  devIndicators: false,
};

export default withPWA(nextConfig);

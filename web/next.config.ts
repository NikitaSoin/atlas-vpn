import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Lock-файлы есть и в корне репозитория (обёртка для хостинга), и здесь —
  // явно говорим Next, что корень приложения именно web/.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;

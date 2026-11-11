import type { NextConfig } from "next";

// Desplegament estàtic (GitHub Pages): `STATIC_EXPORT=1` fa que `next build`
// escrigui el lloc sencer a `out/`, sense servidor de Node. `BASE_PATH` és la
// subruta on se serveix, `/<repositori>` a GitHub Pages; buit en un domini propi.
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(staticExport ? { output: "export" as const } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;

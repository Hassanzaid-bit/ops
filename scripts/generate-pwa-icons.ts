import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "icons");
const LOGO = path.join(process.cwd(), "public", "qzone-logo.png");
const BRAND = "#0b1f3a";

async function makeIcon(size: number, maskable = false) {
  const padding = maskable ? Math.round(size * 0.2) : Math.round(size * 0.12);
  const inner = size - padding * 2;

  const logo = await sharp(LOGO)
    .resize({ width: inner, height: Math.round(inner * 0.39), fit: "inside" })
    .png()
    .toBuffer();

  const meta = await sharp(logo).metadata();
  const logoW = meta.width ?? inner;
  const logoH = meta.height ?? Math.round(inner * 0.39);
  const left = Math.round((size - logoW) / 2);
  const top = Math.round((size - logoH) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BRAND,
    },
  })
    .composite([{ input: logo, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  await mkdir(ROOT, { recursive: true });

  const sizes = [180, 192, 384, 512] as const;
  for (const size of sizes) {
    const buf = await makeIcon(size);
    const name =
      size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
    await writeFile(path.join(ROOT, name), buf);
    console.log(`Wrote ${name}`);
  }

  const maskable = await makeIcon(512, true);
  await writeFile(path.join(ROOT, "icon-maskable-512.png"), maskable);
  console.log("Wrote icon-maskable-512.png");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

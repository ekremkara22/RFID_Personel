function hashSeed(seed: string) {
  return Array.from(seed).reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function pick<T>(items: T[], hash: number, offset: number) {
  return items[(hash + offset) % items.length];
}

export function GET(request: Request) {
  const seed = new URL(request.url).searchParams.get("seed") || "personel";
  const hash = hashSeed(seed);
  const backgrounds = ["#e0f2fe", "#dcfce7", "#fef3c7", "#fae8ff", "#ffe4e6", "#ede9fe"];
  const shirts = ["#0369a1", "#15803d", "#b45309", "#7e22ce", "#be123c", "#0f766e"];
  const skins = ["#f2c9a5", "#d8a47f", "#b87953", "#8d5524"];
  const hair = ["#1f2937", "#3f2a1d", "#111827", "#5b341f"];
  const expression = hash % 3;
  const mouth =
    expression === 0
      ? '<path d="M44 73c7 6 17 6 24 0" fill="none" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/>'
      : expression === 1
        ? '<path d="M45 73h22" fill="none" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/>'
        : '<path d="M44 70c7 8 18 8 25 0" fill="none" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112" role="img" aria-label="Personel profil gorseli">
  <rect width="112" height="112" rx="56" fill="${pick(backgrounds, hash, 0)}"/>
  <path d="M20 105c4-23 18-35 36-35s32 12 36 35" fill="${pick(shirts, hash, 7)}"/>
  <circle cx="56" cy="50" r="29" fill="${pick(skins, hash, 11)}"/>
  <path d="M29 49c1-23 14-35 30-35 16 0 27 12 25 32-11-9-27-13-55 3z" fill="${pick(hair, hash, 17)}"/>
  <circle cx="45" cy="55" r="3.5" fill="#111827"/>
  <circle cx="67" cy="55" r="3.5" fill="#111827"/>
  ${mouth}
  <path d="M36 42c6-4 12-4 17 0M60 42c6-4 12-4 17 0" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" opacity=".35"/>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

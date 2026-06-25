// Curated Unsplash kids'-clothing photo pools, keyed by category slug.
//
// Replaces the previous random picsum images (which showed off-theme photos)
// with on-theme children's-clothing photography. Pools are keyed by category so
// each product gets pictures matching its kind (boy tops, girl dresses, newborn
// bodysuits, …). Every id below was verified to resolve on images.unsplash.com.
//
// Shared by prisma/seed.ts (fresh seed) and prisma/refresh-images.ts (update an
// existing DB) so both produce identical, deterministic URLs per product slug.

const SIZE_PARAMS = "auto=format&fit=crop&w=600&h=750&q=80";

export function unsplashUrl(id: string, params: string = SIZE_PARAMS): string {
  return `https://images.unsplash.com/photo-${id}?${params}`;
}

// Homepage hero banner — a colorful kids'-clothing display.
export const HERO_IMAGE_URL = unsplashUrl(
  "1555529771-835f59fc5efe",
  "auto=format&fit=crop&w=900&h=720&q=80",
);

// Generic kids'-clothing mix, used only if a category slug is missing a pool.
const FALLBACK_POOL: readonly string[] = [
  "1611708314849-8bb91fe0fa56",
  "1569974641446-22542de88536",
  "1518831959646-742c3a14ebf7",
];

export const PRODUCT_IMAGE_POOLS: Record<string, readonly string[]> = {
  // Bé trai — Áo (t-shirt, polo, sơ mi)
  "be-trai-ao": [
    "1627639679690-db4d401aae84", // boy striped tee + denim shorts
    "1603792273674-543a44863980", // boy blue polo shirt
    "1586537182864-75d5ea8a0e3d", // boy plaid shirt + jeans
    "1596392927852-2a18c336fb78", // boy blue dress shirt
    "1502451885777-16c98b07834a", // boy collared shirt + shorts
  ],
  // Bé trai — Quần (short, jeans)
  "be-trai-quan": [
    "1632337950445-ba446cb0e26f", // blue shorts on hanger (product shot)
    "1627639678221-db426a961ba1", // boy tee + denim shorts
    "1586537182864-75d5ea8a0e3d", // boy jeans
    "1627639679608-993e305c1f2c", // boy striped shirt + shorts
  ],
  // Bé trai — Đồ bộ (set áo + quần)
  "be-trai-do-bo": [
    "1502451885777-16c98b07834a", // matching shirt + shorts set
    "1627639679608-993e305c1f2c", // shirt + shorts
    "1627639678221-db426a961ba1", // tee + shorts
  ],
  // Bé trai — Phụ kiện (mũ lưỡi trai)
  "be-trai-phu-kien": [
    "1645266729222-17cd32e06fd0", // yellow baseball cap (product shot)
    "1519337080790-b317436352b2", // boy in baseball cap/gear
    "1772958984378-50760078eb97", // boy wearing a baseball cap
  ],
  // Bé gái — Áo (blouse, croptop)
  "be-gai-ao": [
    "1518831959646-742c3a14ebf7", // girl polka-dot blouse + shorts
    "1578897367107-2828e351c8a8", // girl holding her dress/top
    "1586537333652-9446c3d604a7", // girl in white long-sleeve top
  ],
  // Bé gái — Váy / Đầm
  "be-gai-vay-dam": [
    "1611708314849-8bb91fe0fa56", // two girls in blue dresses
    "1578897366846-358bb1c2412a", // girl red long-sleeved dress
    "1599624427857-461fd60c23e5", // girl white & teal dress
    "1620774760711-caa4c94d683a", // girl white dress + flower headband
    "1562438995-20c8bc11d4a9", // girl dress on lawn
    "1611003967145-fb3960072424", // girl yellow dress
    "1684244160171-97f5dac39204", // white dress hanging (product shot)
  ],
  // Bé gái — Quần (legging)
  "be-gai-quan": [
    "1649318098063-65fc689bcd8a", // girl blue leggings + white tee
    "1649318091747-df71d8a74ced", // girl pink leggings
    "1649318095076-46f25857238e", // girl purple leggings
  ],
  // Bé gái — Phụ kiện (nón, băng đô)
  "be-gai-phu-kien": [
    "1620774760711-caa4c94d683a", // flower headband (băng đô)
    "1725009939572-bd0a1a84dc29", // little girl wearing a hat
    "1578897367107-2828e351c8a8", // girl
  ],
  // Sơ sinh — Body suit
  "so-sinh-body-suit": [
    "1622290319146-7b63df48a635", // baby white & blue onesie
    "1622290291720-ac961c43ee30", // baby onesies
    "1601168313753-6797eabb6550", // baby in polka-dot onesie
    "1622290291468-a28f7a7dc6a8", // baby white onesie
    "1569974641446-22542de88536", // three baby onesies
  ],
  // Sơ sinh — Set
  "so-sinh-set": [
    "1569974641446-22542de88536", // three onesies (set)
    "1768693602418-260d828b878d", // baby clothes in a basket
    "1766918780914-5df4a5a98c44", // baby clothes on a rack
    "1632337948797-ba161d29532b", // baby clothes hanging
  ],
};

// Deterministic RNG (FNV-1a hash + LCG) — mirrors prisma/seed.ts so image
// selection is stable across runs and identical between seed and refresh.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: string): () => number {
  let state = hashString(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickMany<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0] as T);
  }
  return out;
}

export type SeededImage = {
  url: string;
  alt: string;
  sortOrder: number;
  isPrimary: boolean;
};

// Returns 2–3 deterministic, on-theme images for a product, seeded by its slug.
export function imagesForProduct(
  slug: string,
  name: string,
  categorySlug: string,
): SeededImage[] {
  const pool = PRODUCT_IMAGE_POOLS[categorySlug] ?? FALLBACK_POOL;
  const rng = makeRng(`${slug}:images`);
  const count = Math.min(pool.length, 2 + Math.floor(rng() * 2)); // 2–3
  return pickMany(rng, pool, count).map((id, i) => ({
    url: unsplashUrl(id),
    alt: `${name} - ảnh ${i + 1}`,
    sortOrder: i,
    isPrimary: i === 0,
  }));
}

import {
  PrismaClient,
  UserRole,
  Gender,
  AgeRange,
  ProductStatus,
  ReviewStatus,
  DiscountType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { imagesForProduct, unsplashUrl } from "./product-images";

// ============================================
// Env loading & guards
// ============================================

const {
  SEED_ADMIN_EMAIL,
  SEED_ADMIN_PASSWORD,
  SEED_TEST_USER_EMAIL,
  SEED_TEST_USER_PASSWORD,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    console.error(`❌ Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const ADMIN_EMAIL = requireEnv("SEED_ADMIN_EMAIL", SEED_ADMIN_EMAIL);
const ADMIN_PASSWORD = requireEnv("SEED_ADMIN_PASSWORD", SEED_ADMIN_PASSWORD);
const TEST_USER_EMAIL = requireEnv("SEED_TEST_USER_EMAIL", SEED_TEST_USER_EMAIL);
const TEST_USER_PASSWORD = requireEnv(
  "SEED_TEST_USER_PASSWORD",
  SEED_TEST_USER_PASSWORD,
);
const SUPABASE_URL = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  NEXT_PUBLIC_SUPABASE_URL,
);
const SERVICE_ROLE_KEY = requireEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  SUPABASE_SERVICE_ROLE_KEY,
);

const prisma = new PrismaClient();
const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================
// Deterministic RNG (LCG seeded by string hash)
// ============================================

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

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
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

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ============================================
// Vietnamese diacritic stripping (for SKU)
// ============================================

function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function skuToken(s: string): string {
  return stripDiacritics(s)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================
// Supabase user upsert
// ============================================

async function ensureSupabaseUser(
  email: string,
  password: string,
  name: string,
): Promise<string> {
  // Search by email — listUsers paginates, but for seed it's fine to scan first page
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;
  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) {
    throw error ?? new Error(`Failed to create auth user ${email}`);
  }
  return data.user.id;
}

async function waitForUserRow(userId: string, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const row = await prisma.user.findUnique({ where: { id: userId } });
    if (row) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `public.User row for ${userId} did not appear — DB trigger sync_auth_user_to_public may be missing`,
  );
}

// ============================================
// Data constants
// ============================================

const COLOR_PALETTE = [
  { color: "Trắng", colorHex: "#FFFFFF" },
  { color: "Đen", colorHex: "#1F1A17" },
  { color: "Xám nhạt", colorHex: "#C7C7C7" },
  { color: "Hồng phấn", colorHex: "#FFC7D2" },
  { color: "Xanh navy", colorHex: "#1E3A5F" },
  { color: "Vàng pastel", colorHex: "#FFE8A3" },
  { color: "Mint", colorHex: "#B8E0D2" },
] as const;

type SizeOption = { size: string; note: string };

const SIZE_NEWBORN: readonly SizeOption[] = [
  { size: "0-3M", note: "0-3M (50-60cm, 3-5kg)" },
  { size: "3-6M", note: "3-6M (60-66cm, 5-7kg)" },
  { size: "6-12M", note: "6-12M (66-76cm, 7-10kg)" },
];

const SIZE_KID: readonly SizeOption[] = [
  { size: "1T", note: "1T (76-85cm, 9-11kg)" },
  { size: "2T", note: "2T (85-92cm, 11-13kg)" },
  { size: "3T", note: "3T (92-100cm, 13-15kg)" },
  { size: "4T", note: "4T (100-108cm, 15-17kg)" },
  { size: "6T", note: "6T (108-118cm, 17-20kg)" },
  { size: "8T", note: "8T (118-128cm, 20-25kg)" },
  { size: "10T", note: "10T (128-138cm, 25-32kg)" },
  { size: "12T", note: "12T (138-150cm, 32-40kg)" },
];

type CategorySeed = {
  slug: string;
  name: string;
  sortOrder: number;
  children: { slug: string; name: string; sortOrder: number }[];
};

const CATEGORY_TREE: CategorySeed[] = [
  {
    slug: "be-trai",
    name: "Bé trai",
    sortOrder: 1,
    children: [
      { slug: "be-trai-ao", name: "Áo", sortOrder: 1 },
      { slug: "be-trai-quan", name: "Quần", sortOrder: 2 },
      { slug: "be-trai-do-bo", name: "Đồ bộ", sortOrder: 3 },
      { slug: "be-trai-phu-kien", name: "Phụ kiện", sortOrder: 4 },
    ],
  },
  {
    slug: "be-gai",
    name: "Bé gái",
    sortOrder: 2,
    children: [
      { slug: "be-gai-ao", name: "Áo", sortOrder: 1 },
      { slug: "be-gai-vay-dam", name: "Váy / Đầm", sortOrder: 2 },
      { slug: "be-gai-quan", name: "Quần", sortOrder: 3 },
      { slug: "be-gai-phu-kien", name: "Phụ kiện", sortOrder: 4 },
    ],
  },
  {
    slug: "so-sinh",
    name: "Sơ sinh",
    sortOrder: 3,
    children: [
      { slug: "so-sinh-body-suit", name: "Body suit", sortOrder: 1 },
      { slug: "so-sinh-set", name: "Set sơ sinh", sortOrder: 2 },
    ],
  },
];

type ProductSeed = {
  slug: string;
  name: string;
  categorySlug: string;
  gender: Gender;
  ageRange: AgeRange[];
  basePrice: number;
  description: string;
  material: string;
  origin: string;
  careGuide: string;
  ageBucket: "newborn" | "kid";
  hasCompare: boolean;
};

const BASE_CARE =
  "Giặt máy ở nhiệt độ dưới 30°C, không dùng chất tẩy mạnh, phơi nơi thoáng mát, ủi mặt trái ở nhiệt độ thấp.";
const BASE_ORIGIN = "Sản xuất tại Việt Nam";

const PRODUCT_SEEDS: ProductSeed[] = [
  // Bé trai - Áo
  {
    slug: "ao-thun-be-trai-ngan-tay-co-ban",
    name: "Áo thun bé trai ngắn tay cơ bản",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 129000,
    description:
      "Áo thun cotton 100% mềm mại, thoáng mát, thấm hút mồ hôi tốt. Form rộng rãi thoải mái cho bé vận động cả ngày. Phù hợp cho bé trai 3-12 tuổi mặc đi học hoặc đi chơi.",
    material: "Cotton 100% (220gsm)",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: true,
  },
  {
    slug: "ao-polo-be-trai",
    name: "Áo polo bé trai",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 199000,
    description:
      "Áo polo cá sấu vải dày dặn, lên form chuẩn lịch lãm. Cổ bo dệt chắc chắn, ít xù lông sau nhiều lần giặt. Lựa chọn lý tưởng cho dịp đi tiệc, đi học hoặc chụp ảnh gia đình.",
    material: "Cotton pique 92% + Spandex 8%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "ao-so-mi-caro-be-trai",
    name: "Áo sơ mi caro bé trai",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 249000,
    description:
      "Áo sơ mi họa tiết caro vintage, chất kate mềm mịn không nhăn. Đường may chắc chắn, cúc bấm dễ thao tác cho bé tự mặc. Mix cùng quần jeans hoặc quần kaki đều phong cách.",
    material: "Kate Hàn (Cotton 65% + Polyester 35%)",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé trai - Quần
  {
    slug: "quan-short-kaki-be-trai",
    name: "Quần short kaki bé trai",
    categorySlug: "be-trai-quan",
    gender: Gender.BOY,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 159000,
    description:
      "Quần short kaki form đứng, lưng chun co giãn thoải mái. Vải kaki cotton dày vừa phải, không bai nhão sau giặt. Thiết kế tối giản, dễ phối với mọi kiểu áo.",
    material: "Kaki cotton 97% + Spandex 3%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "quan-jeans-dai-be-trai",
    name: "Quần jeans dài bé trai",
    categorySlug: "be-trai-quan",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 289000,
    description:
      "Quần jeans dài chất denim mềm, có độ co giãn nhẹ giúp bé thoải mái vận động. Đường chỉ chắc chắn, lưng chun tiện lợi. Phong cách năng động cho bé trai từ 3 tuổi.",
    material: "Denim cotton 98% + Spandex 2%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: true,
  },
  // Bé trai - Đồ bộ
  {
    slug: "set-bo-ngan-tay-hinh-thu-be-trai",
    name: "Set bộ ngắn tay hình thú bé trai",
    categorySlug: "be-trai-do-bo",
    gender: Gender.BOY,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 219000,
    description:
      "Set bộ áo thun + quần short họa tiết thú dễ thương. Chất cotton mềm mát, in nhiệt sắc nét bền màu. Quà tặng ý nghĩa cho các bé trai năng động.",
    material: "Cotton 95% + Spandex 5%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé trai - Phụ kiện
  {
    slug: "mu-luoi-trai-be-trai",
    name: "Mũ lưỡi trai bé trai",
    categorySlug: "be-trai-phu-kien",
    gender: Gender.BOY,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 99000,
    description:
      "Mũ lưỡi trai thiết kế cá tính, vành cứng giúp che nắng tốt. Quai sau điều chỉnh được kích thước, ôm đầu thoải mái. Phụ kiện không thể thiếu khi đi chơi cuối tuần.",
    material: "Cotton twill",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay với nước lạnh, không vắt, phơi nơi thoáng.",
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Áo
  {
    slug: "ao-be-gai-tay-phong-hoa-tiet-hoa",
    name: "Áo bé gái tay phồng họa tiết hoa",
    categorySlug: "be-gai-ao",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 189000,
    description:
      "Áo tay phồng nữ tính với họa tiết hoa nhỏ tinh tế. Chất vải mềm rũ, lên dáng đẹp. Bé sẽ tự tin và xinh xắn trong mọi dịp đặc biệt.",
    material: "Cotton tweed 100%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "ao-croptop-be-gai",
    name: "Áo croptop bé gái",
    categorySlug: "be-gai-ao",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_6_12],
    basePrice: 149000,
    description:
      "Áo croptop dáng ngắn trendy cho bé gái lứa tuổi tween. Chất thun cotton 4 chiều ôm vừa vặn, thoáng mát. Phối cùng quần lưng cao tạo set đồ năng động.",
    material: "Cotton 4 chiều 95% + Spandex 5%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Váy / Đầm
  {
    slug: "vay-dam-cong-chua-be-gai",
    name: "Váy đầm công chúa bé gái",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 359000,
    description:
      "Đầm công chúa nhiều tầng voan mềm mại, đính nơ tinh tế ở eo. Lớp lót cotton chống xước da bé. Lựa chọn hoàn hảo cho sinh nhật và sự kiện đặc biệt.",
    material: "Voan tổ ong + lót cotton 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay nhẹ nhàng, không vắt mạnh, phơi trong bóng râm.",
    ageBucket: "kid",
    hasCompare: true,
  },
  {
    slug: "dam-so-mi-be-gai-dang-a",
    name: "Đầm sơ mi bé gái dáng A",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 269000,
    description:
      "Đầm sơ mi dáng A thanh lịch, cổ đức nhỏ xinh. Vải mềm, thoáng mát, phù hợp đi học hoặc dạo phố. Form dáng dễ mặc, tôn lên vẻ duyên dáng của bé.",
    material: "Cotton Nhật 100%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "vay-xoe-ren-be-gai",
    name: "Váy xòe ren bé gái",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 229000,
    description:
      "Váy xòe phối ren nữ tính, cạp chun co giãn thoải mái. Lớp tùng phồng vừa phải, không quá rườm rà. Phối được nhiều kiểu áo, dễ mix-match.",
    material: "Cotton + ren polyester",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Quần
  {
    slug: "quan-legging-be-gai-det-kim",
    name: "Quần legging bé gái dệt kim",
    categorySlug: "be-gai-quan",
    gender: Gender.GIRL,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 119000,
    description:
      "Quần legging dệt kim co giãn 4 chiều, ôm chân vừa vặn. Lưng chun mềm không hằn da. Phối được với đầm, áo dài hay áo thun đều phù hợp.",
    material: "Cotton 92% + Spandex 8%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Phụ kiện
  {
    slug: "non-vanh-tron-be-gai",
    name: "Nón vành tròn bé gái",
    categorySlug: "be-gai-phu-kien",
    gender: Gender.GIRL,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 139000,
    description:
      "Nón vành tròn phong cách vintage, đính nơ ruy băng nhỏ xinh. Chất liệu cói tổng hợp nhẹ, thoáng. Phụ kiện hoàn hảo cho những buổi dã ngoại mùa hè.",
    material: "Cói tổng hợp",
    origin: BASE_ORIGIN,
    careGuide: "Lau bằng khăn ẩm, tránh ngâm nước.",
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "bang-do-no-be-gai",
    name: "Băng đô nơ bé gái",
    categorySlug: "be-gai-phu-kien",
    gender: Gender.GIRL,
    ageRange: [AgeRange.NEWBORN_0_1, AgeRange.TODDLER_1_3],
    basePrice: 99000,
    description:
      "Băng đô nơ mềm mại, không siết chặt đầu bé. Chất liệu cotton co giãn an toàn cho da nhạy cảm. Set 3 màu tiện lợi cho mẹ thay đổi mỗi ngày.",
    material: "Cotton co giãn",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay với nước ấm, không sấy khô.",
    ageBucket: "kid",
    hasCompare: false,
  },
  // Sơ sinh - Body suit
  {
    slug: "body-suit-so-sinh-cotton-tay-dai",
    name: "Body suit sơ sinh cotton tay dài",
    categorySlug: "so-sinh-body-suit",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 149000,
    description:
      "Body suit tay dài chất cotton organic dịu nhẹ, an toàn cho làn da non nớt. Cúc bấm ở đáy giúp mẹ thay tã dễ dàng. Đường may lộn chống cọ xát da bé.",
    material: "Cotton organic 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: false,
  },
  {
    slug: "body-suit-so-sinh-tay-ngan-hoa-tiet",
    name: "Body suit sơ sinh tay ngắn họa tiết",
    categorySlug: "so-sinh-body-suit",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 129000,
    description:
      "Body suit tay ngắn họa tiết đáng yêu, in nhiệt an toàn. Vải cotton mềm thoáng, thấm hút tốt cho mùa hè. Form rộng rãi giúp bé thoải mái vận động.",
    material: "Cotton 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: true,
  },
  {
    slug: "body-suit-so-sinh-co-non",
    name: "Body suit sơ sinh có nón",
    categorySlug: "so-sinh-body-suit",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 169000,
    description:
      "Body suit kèm nón liền tiện lợi, giữ ấm đầu bé khi đi ngủ. Cotton 2 lớp ấm áp nhưng vẫn thoáng. Quà tặng ý nghĩa cho mẹ và bé sơ sinh.",
    material: "Cotton 2 lớp",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: false,
  },
  // Sơ sinh - Set
  {
    slug: "set-5-mon-so-sinh-hop-qua",
    name: "Set 5 món sơ sinh hộp quà",
    categorySlug: "so-sinh-set",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 399000,
    description:
      "Hộp quà 5 món gồm body suit, quần dài, mũ, bao tay và bao chân. Tất cả từ cotton tự nhiên an toàn cho bé sơ sinh. Đóng gói lịch sự, là món quà đầy đặn đi thăm bé.",
    material: "Cotton tự nhiên 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: true,
  },
  {
    slug: "set-so-sinh-cotton-organic-3-mon",
    name: "Set sơ sinh cotton organic 3 món",
    categorySlug: "so-sinh-set",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 299000,
    description:
      "Set 3 món áo dài tay + quần dài + mũ chất cotton organic dệt mềm. Không chứa thuốc nhuộm độc hại, đạt chuẩn OEKO-TEX. An tâm cho làn da nhạy cảm của bé sơ sinh.",
    material: "Cotton organic OEKO-TEX",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: false,
  },

  // ---- Mở rộng danh mục (đợt 2) ----
  // Bé trai - Áo
  {
    slug: "ao-thun-dai-tay-be-trai",
    name: "Áo thun dài tay bé trai",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 149000,
    description:
      "Áo thun dài tay cotton interlock dày dặn, giữ ấm nhẹ cho ngày se lạnh. Cổ bo co giãn, không cấn da bé. Form cơ bản dễ phối với mọi loại quần.",
    material: "Cotton interlock 100%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "ao-khoac-gio-be-trai",
    name: "Áo khoác gió bé trai",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 329000,
    description:
      "Áo khoác gió 2 lớp chống nước nhẹ, có mũ trùm tiện lợi. Khóa kéo chắc chắn, túi hai bên giữ ấm tay. Lựa chọn năng động cho bé khi đi học hoặc dã ngoại.",
    material: "Polyester chống thấm + lót lưới",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: true,
  },
  {
    slug: "ao-ba-lo-be-trai",
    name: "Áo ba lỗ bé trai",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 89000,
    description:
      "Áo ba lỗ cotton mỏng nhẹ, thoáng mát cho ngày hè oi bức. Mặc lót hoặc mặc ngoài đều phù hợp. Thấm hút mồ hôi tốt, dễ giặt nhanh khô.",
    material: "Cotton 100%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "ao-so-mi-tay-dai-be-trai",
    name: "Áo sơ mi tay dài bé trai",
    categorySlug: "be-trai-ao",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 229000,
    description:
      "Áo sơ mi tay dài trơn lịch sự, chất kate mềm ít nhăn. Phù hợp đi tiệc, chụp ảnh hoặc dịp trang trọng. Dễ phối cùng quần tây hay quần jeans.",
    material: "Kate Hàn (Cotton 65% + Polyester 35%)",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé trai - Quần
  {
    slug: "quan-jogger-ni-be-trai",
    name: "Quần jogger nỉ bé trai",
    categorySlug: "be-trai-quan",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 179000,
    description:
      "Quần jogger nỉ bông ấm áp, bo gấu ôm cổ chân năng động. Lưng chun kèm dây rút điều chỉnh vừa vặn. Thoải mái cho bé chạy nhảy cả ngày.",
    material: "Nỉ bông Cotton 80% + Polyester 20%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "quan-dai-kaki-be-trai",
    name: "Quần dài kaki bé trai",
    categorySlug: "be-trai-quan",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 209000,
    description:
      "Quần dài kaki form đứng lịch sự, vải dày vừa phải không bai. Lưng chun sau tiện lợi, túi hộp cá tính. Phù hợp đi học và đi chơi.",
    material: "Kaki cotton 97% + Spandex 3%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: true,
  },
  // Bé trai - Đồ bộ
  {
    slug: "set-dai-tay-be-trai-mua-thu",
    name: "Set dài tay bé trai mùa thu",
    categorySlug: "be-trai-do-bo",
    gender: Gender.BOY,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 259000,
    description:
      "Set áo dài tay + quần dài chất cotton da cá ấm áp. Họa tiết in dễ thương, đường may tỉ mỉ. Trọn bộ tiện lợi cho mẹ phối đồ mùa thu.",
    material: "Cotton da cá 95% + Spandex 5%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "set-the-thao-be-trai",
    name: "Set thể thao bé trai",
    categorySlug: "be-trai-do-bo",
    gender: Gender.BOY,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 239000,
    description:
      "Set thể thao áo thun + quần short phối viền khỏe khoắn. Vải thun mè thoáng, thấm hút nhanh. Lý tưởng cho bé vận động, chơi thể thao.",
    material: "Polyester mè 100%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé trai - Phụ kiện
  {
    slug: "tat-co-cao-be-trai-set-5",
    name: "Tất cổ cao bé trai (set 5 đôi)",
    categorySlug: "be-trai-phu-kien",
    gender: Gender.BOY,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 79000,
    description:
      "Set 5 đôi tất cổ cao cotton mềm, co giãn ôm chân. Nhiều màu cơ bản tiện phối đồ. Đường may mũi tất phẳng, không cấn ngón chân bé.",
    material: "Cotton 80% + Spandex 20%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay hoặc giặt máy túi lưới, không dùng chất tẩy.",
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Áo
  {
    slug: "ao-len-co-tron-be-gai",
    name: "Áo len cổ tròn bé gái",
    categorySlug: "be-gai-ao",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 219000,
    description:
      "Áo len cổ tròn dệt kim mềm, giữ ấm tốt mà không bí. Sợi len không xù, ít gây ngứa da bé. Màu pastel ngọt ngào dễ phối váy hoặc quần.",
    material: "Len acrylic cao cấp",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay nước lạnh, phơi ngang để giữ form.",
    ageBucket: "kid",
    hasCompare: true,
  },
  {
    slug: "ao-thun-hoa-tiet-be-gai",
    name: "Áo thun họa tiết bé gái",
    categorySlug: "be-gai-ao",
    gender: Gender.GIRL,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 129000,
    description:
      "Áo thun in họa tiết hoạt hình đáng yêu, chất cotton mềm mát. Mực in an toàn, bền màu sau nhiều lần giặt. Món cơ bản không thể thiếu trong tủ đồ của bé.",
    material: "Cotton 100% (210gsm)",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "ao-cardigan-len-be-gai",
    name: "Áo cardigan len bé gái",
    categorySlug: "be-gai-ao",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 239000,
    description:
      "Cardigan len mỏng khoác ngoài nhẹ nhàng, đính cúc xinh xắn. Dễ cởi khi trời ấm, khoác lại khi se lạnh. Tôn nét dịu dàng cho bé gái.",
    material: "Len acrylic 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay nước lạnh, phơi ngang để giữ form.",
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Váy / Đầm
  {
    slug: "dam-du-tiec-be-gai",
    name: "Đầm dự tiệc bé gái",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 389000,
    description:
      "Đầm dự tiệc phối ren và kim sa lấp lánh, tùng xòe sang trọng. Lớp lót cotton mềm chống xước da. Giúp bé tỏa sáng trong các buổi tiệc.",
    material: "Voan + ren + lót cotton 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay nhẹ nhàng, không vắt mạnh, phơi trong bóng râm.",
    ageBucket: "kid",
    hasCompare: true,
  },
  {
    slug: "vay-yem-bo-be-gai",
    name: "Váy yếm bò bé gái",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 199000,
    description:
      "Váy yếm chất jean mềm, dây đeo điều chỉnh được độ dài. Túi trước tiện lợi, phối áo thun là ra set năng động. Phong cách Hàn Quốc dễ thương.",
    material: "Denim cotton 98% + Spandex 2%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "dam-maxi-be-gai-di-bien",
    name: "Đầm maxi bé gái đi biển",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 249000,
    description:
      "Đầm maxi dáng dài bay bổng, họa tiết hoa nhiệt đới tươi mát. Vải voan nhẹ thoáng, lý tưởng cho chuyến đi biển. Tôn vẻ điệu đà của bé gái.",
    material: "Voan polyester + lót cotton",
    origin: BASE_ORIGIN,
    careGuide: "Giặt tay nhẹ nhàng, phơi nơi thoáng mát.",
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "chan-vay-tennis-be-gai",
    name: "Chân váy tennis bé gái",
    categorySlug: "be-gai-vay-dam",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 159000,
    description:
      "Chân váy tennis xếp ly trẻ trung, có quần lót trong tiện lợi. Cạp chun ôm vừa vặn, vận động thoải mái. Phối áo thun hay áo len đều xinh.",
    material: "Polyester 95% + Spandex 5%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Quần
  {
    slug: "quan-jeans-lung-cao-be-gai",
    name: "Quần jeans lưng cao bé gái",
    categorySlug: "be-gai-quan",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 259000,
    description:
      "Quần jeans lưng cao tôn dáng, chất denim co giãn nhẹ. Đường may chắc, lưng chun phía sau tiện lợi. Phong cách thời thượng cho bé gái tween.",
    material: "Denim cotton 98% + Spandex 2%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "quan-short-gia-vay-be-gai",
    name: "Quần short giả váy bé gái",
    categorySlug: "be-gai-quan",
    gender: Gender.GIRL,
    ageRange: [AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 139000,
    description:
      "Quần short giả váy vừa xinh vừa tiện cho bé vận động. Cạp chun mềm, lớp ngoài xòe nhẹ như chân váy. An tâm khi bé chạy nhảy.",
    material: "Cotton 95% + Spandex 5%",
    origin: BASE_ORIGIN,
    careGuide: BASE_CARE,
    ageBucket: "kid",
    hasCompare: false,
  },
  // Bé gái - Phụ kiện
  {
    slug: "set-kep-toc-no-be-gai",
    name: "Set kẹp tóc nơ bé gái (10 chiếc)",
    categorySlug: "be-gai-phu-kien",
    gender: Gender.GIRL,
    ageRange: [AgeRange.NEWBORN_0_1, AgeRange.TODDLER_1_3, AgeRange.KID_3_6],
    basePrice: 69000,
    description:
      "Set 10 kẹp tóc nơ nhiều màu, chốt kẹp bọc nhựa an toàn. Nơ vải mềm không xơ cứng. Giúp mẹ thay đổi kiểu tóc cho bé mỗi ngày.",
    material: "Vải + kẹp kim loại bọc nhựa",
    origin: BASE_ORIGIN,
    careGuide: "Lau bằng khăn ẩm, tránh ngâm nước lâu.",
    ageBucket: "kid",
    hasCompare: false,
  },
  {
    slug: "tui-deo-cheo-be-gai",
    name: "Túi đeo chéo bé gái",
    categorySlug: "be-gai-phu-kien",
    gender: Gender.GIRL,
    ageRange: [AgeRange.KID_3_6, AgeRange.KID_6_12],
    basePrice: 119000,
    description:
      "Túi đeo chéo nhỏ xinh hình thú, dây đeo điều chỉnh được. Khóa kéo êm, ngăn chính rộng đựng vừa đồ lặt vặt. Phụ kiện điệu đà cho bé khi đi chơi.",
    material: "Da PU + vải lót",
    origin: BASE_ORIGIN,
    careGuide: "Lau bằng khăn ẩm, không giặt máy.",
    ageBucket: "kid",
    hasCompare: false,
  },
  // Sơ sinh - Body suit
  {
    slug: "body-suit-so-sinh-ke-soc",
    name: "Body suit sơ sinh kẻ sọc",
    categorySlug: "so-sinh-body-suit",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 139000,
    description:
      "Body suit kẻ sọc tay dài chất cotton mềm mịn, an toàn cho da bé. Cúc bấm đáy tiện thay tã. Họa tiết kẻ trung tính phù hợp cả bé trai và bé gái.",
    material: "Cotton 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: false,
  },
  {
    slug: "body-suit-cardigan-so-sinh",
    name: "Body suit kèm áo cardigan sơ sinh",
    categorySlug: "so-sinh-body-suit",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 199000,
    description:
      "Bộ body suit kèm cardigan mỏng khoác ngoài, giữ ấm linh hoạt. Cotton organic dịu nhẹ, đường may lộn chống cọ xát. Món quà sơ sinh chỉn chu.",
    material: "Cotton organic 100%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: true,
  },
  // Sơ sinh - Set
  {
    slug: "set-do-dong-xuan-so-sinh",
    name: "Set đồ đông xuân sơ sinh",
    categorySlug: "so-sinh-set",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 259000,
    description:
      "Set đồ đông xuân chần bông nhẹ, ấm áp cho bé ngày lạnh. Cotton 2 lớp mềm mại, cài cúc tiện lợi. Gồm áo dài tay và quần dài liền nhau.",
    material: "Cotton chần bông 2 lớp",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: false,
  },
  {
    slug: "set-ao-noi-quan-so-sinh",
    name: "Set áo nối quần sơ sinh",
    categorySlug: "so-sinh-set",
    gender: Gender.UNISEX,
    ageRange: [AgeRange.NEWBORN_0_1],
    basePrice: 189000,
    description:
      "Set áo nối quần liền thân, ôm gọn giữ ấm bụng bé. Chất cotton co giãn mềm mại, cúc bấm dọc thân tiện thay đồ. An toàn cho làn da sơ sinh.",
    material: "Cotton 95% + Spandex 5%",
    origin: BASE_ORIGIN,
    careGuide: "Giặt máy nhẹ dưới 30°C, không dùng nước xả vải mạnh.",
    ageBucket: "newborn",
    hasCompare: false,
  },
];

// ============================================
// Seed functions
// ============================================

async function seedUsers(): Promise<void> {
  console.log("🌱 Seeding admin user...");
  const adminId = await ensureSupabaseUser(
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    "Ecokids Admin",
  );
  await waitForUserRow(adminId);
  await prisma.user.update({
    where: { id: adminId },
    data: { role: UserRole.ADMIN, name: "Ecokids Admin" },
  });
  console.log(`✅ Admin: ${ADMIN_EMAIL}`);

  console.log("🌱 Seeding test customer users...");
  const c1Id = await ensureSupabaseUser(
    "customer1@ecokids.test",
    "Test1234!",
    "Khách Hàng 1",
  );
  await waitForUserRow(c1Id);
  await prisma.user.update({
    where: { id: c1Id },
    data: { name: "Khách Hàng 1", phone: "0901234567" },
  });

  const c2Id = await ensureSupabaseUser(
    "customer2@ecokids.test",
    "Test1234!",
    "Khách Hàng 2",
  );
  await waitForUserRow(c2Id);
  await prisma.user.update({
    where: { id: c2Id },
    data: { name: "Khách Hàng 2", phone: "0907654321" },
  });

  // Also seed the env-driven test user if different
  if (
    TEST_USER_EMAIL.toLowerCase() !== "customer1@ecokids.test" &&
    TEST_USER_EMAIL.toLowerCase() !== "customer2@ecokids.test"
  ) {
    const envId = await ensureSupabaseUser(
      TEST_USER_EMAIL,
      TEST_USER_PASSWORD,
      "Test User",
    );
    await waitForUserRow(envId);
  }

  console.log("✅ Customers: customer1@ecokids.test, customer2@ecokids.test");

  // Addresses for customer1
  const existingAddrs = await prisma.address.count({ where: { userId: c1Id } });
  if (existingAddrs === 0) {
    await prisma.address.create({
      data: {
        userId: c1Id,
        recipientName: "Khách Hàng 1",
        phone: "0901234567",
        province: "Thành phố Hồ Chí Minh",
        provinceCode: "79",
        district: "Quận 1",
        districtCode: "760",
        ward: "Phường Bến Nghé",
        wardCode: "26734",
        addressLine: "12 Lý Tự Trọng",
        isDefault: true,
      },
    });
    await prisma.address.create({
      data: {
        userId: c1Id,
        recipientName: "Khách Hàng 1",
        phone: "0901234567",
        province: "Thành phố Hà Nội",
        provinceCode: "01",
        district: "Quận Hoàn Kiếm",
        districtCode: "002",
        ward: "Phường Hàng Bài",
        wardCode: "00079",
        addressLine: "45 Phố Huế",
        isDefault: false,
      },
    });
    console.log("✅ Đã tạo 2 addresses cho customer1");
  } else {
    console.log("ℹ️  Addresses cho customer1 đã tồn tại, bỏ qua");
  }
}

async function seedCategories(): Promise<Map<string, string>> {
  console.log("🌱 Seeding categories...");
  const slugToId = new Map<string, string>();

  for (const parent of CATEGORY_TREE) {
    const parentRow = await prisma.category.upsert({
      where: { slug: parent.slug },
      update: { name: parent.name, sortOrder: parent.sortOrder, parentId: null },
      create: {
        slug: parent.slug,
        name: parent.name,
        sortOrder: parent.sortOrder,
      },
    });
    slugToId.set(parent.slug, parentRow.id);

    for (const child of parent.children) {
      const childRow = await prisma.category.upsert({
        where: { slug: child.slug },
        update: {
          name: child.name,
          sortOrder: child.sortOrder,
          parentId: parentRow.id,
        },
        create: {
          slug: child.slug,
          name: child.name,
          sortOrder: child.sortOrder,
          parentId: parentRow.id,
        },
      });
      slugToId.set(child.slug, childRow.id);
    }
  }
  console.log(`✅ Đã tạo ${slugToId.size} categories`);
  return slugToId;
}

async function seedProducts(slugToCategoryId: Map<string, string>): Promise<void> {
  console.log("🌱 Seeding products...");
  const outOfStockSkus: string[] = [];
  let created = 0;

  for (const seed of PRODUCT_SEEDS) {
    const categoryId = slugToCategoryId.get(seed.categorySlug);
    if (!categoryId) {
      throw new Error(`Category not found: ${seed.categorySlug}`);
    }

    // Additive: skip products already present so re-running only adds new ones.
    const alreadyExists = await prisma.product.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });
    if (alreadyExists) continue;
    created++;

    const rng = makeRng(seed.slug);
    const comparePrice = seed.hasCompare
      ? Math.round((seed.basePrice * 1.25) / 1000) * 1000
      : null;

    const product = await prisma.product.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        categoryId,
        ageRange: seed.ageRange,
        gender: seed.gender,
        basePrice: seed.basePrice,
        comparePrice,
        status: ProductStatus.ACTIVE,
        material: seed.material,
        origin: seed.origin,
        careGuide: seed.careGuide,
      },
    });

    // Images: 2-3 curated Unsplash kids'-clothing photos, deterministic by slug
    for (const img of imagesForProduct(seed.slug, seed.name, seed.categorySlug)) {
      await prisma.productImage.create({
        data: { productId: product.id, ...img },
      });
    }

    // Variants: pick 1-3 colors × 2-3 sizes (cap at 6 variants)
    const sizes = seed.ageBucket === "newborn" ? SIZE_NEWBORN : SIZE_KID;
    const colorCount = randInt(rng, 1, 3);
    const colors = pickMany(rng, COLOR_PALETTE, colorCount);
    const sizeCount = Math.min(
      randInt(rng, 2, 3),
      Math.ceil(6 / Math.max(colors.length, 1)),
    );
    const chosenSizes = pickMany(rng, sizes, sizeCount);

    let variantNum = 0;
    for (const color of colors) {
      for (const sz of chosenSizes) {
        if (variantNum >= 6) break;
        variantNum++;
        // 10-15% chance of being out of stock
        const stock = rng() < 0.12 ? 0 : randInt(rng, 5, 50);
        const sku = `${skuToken(seed.slug)}-${skuToken(sz.size)}-${skuToken(color.color)}`;
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku,
            size: sz.size,
            sizeNote: sz.note,
            color: color.color,
            colorHex: color.colorHex,
            stock,
          },
        });
        if (stock === 0) outOfStockSkus.push(sku);
      }
    }
  }

  console.log(
    `✅ Đã tạo ${created} products mới (tổng đặc tả ${PRODUCT_SEEDS.length})`,
  );
  if (outOfStockSkus.length > 0) {
    console.log(
      `📦 Variants out-of-stock (test UI hết hàng): ${outOfStockSkus.join(", ")}`,
    );
  } else {
    console.log("ℹ️  Không có variant nào out-of-stock lần seed này");
  }
}

// ============================================
// Realistic demo data (reviews, orders, vouchers, …)
// ============================================

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

const REVIEWER_SEEDS: { email: string; name: string }[] = [
  { email: "reviewer1@ecokids.test", name: "Nguyễn Thu Hà" },
  { email: "reviewer2@ecokids.test", name: "Trần Minh Anh" },
  { email: "reviewer3@ecokids.test", name: "Lê Hoàng Phúc" },
  { email: "reviewer4@ecokids.test", name: "Phạm Thị Mai" },
  { email: "reviewer5@ecokids.test", name: "Vũ Quốc Khánh" },
  { email: "reviewer6@ecokids.test", name: "Đặng Bảo Ngọc" },
  { email: "reviewer7@ecokids.test", name: "Bùi Thanh Tâm" },
  { email: "reviewer8@ecokids.test", name: "Hoàng Yến Nhi" },
];

const REVIEW_TITLES = [
  "Rất hài lòng",
  "Chất lượng tốt",
  "Đáng tiền",
  "Sẽ ủng hộ tiếp",
  "Đẹp như hình",
  "Bé nhà mình thích lắm",
];

const REVIEW_COMMENTS_POSITIVE = [
  "Vải mềm mịn, bé mặc thoải mái cả ngày. Mình sẽ mua thêm màu khác.",
  "Đường may chắc chắn, form chuẩn như mô tả. Giao hàng nhanh nữa.",
  "Màu sắc tươi, giặt nhiều lần không phai. Rất đáng tiền.",
  "Chất cotton mát, thấm hút tốt, bé không bị hầm. Shop tư vấn nhiệt tình.",
  "Size vừa vặn với bé 3 tuổi nhà mình. Đóng gói cẩn thận.",
  "Mặc lên xinh y như hình, bé thích lắm. Sẽ giới thiệu bạn bè.",
];

const REVIEW_COMMENTS_NEUTRAL = [
  "Sản phẩm ổn so với giá. Màu thực tế hơi khác hình một chút.",
  "Chất lượng tạm ổn, form hơi rộng nên nên chọn nhỏ hơn một size.",
  "Giao hàng hơi lâu nhưng sản phẩm thì đúng mô tả.",
];

const VOUCHER_SEEDS: {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
}[] = [
  {
    code: "WELCOME10",
    description: "Giảm 10% cho đơn hàng đầu tiên",
    discountType: DiscountType.PERCENT,
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: 100000,
    usageLimit: 500,
    perUserLimit: 1,
  },
  {
    code: "FREESHIP30",
    description: "Miễn phí vận chuyển (giảm 30.000đ) cho đơn từ 199.000đ",
    discountType: DiscountType.FIXED,
    discountValue: 30000,
    minOrderValue: 199000,
    maxDiscount: null,
    usageLimit: 1000,
    perUserLimit: null,
  },
  {
    code: "SALE50K",
    description: "Giảm 50.000đ cho đơn từ 500.000đ",
    discountType: DiscountType.FIXED,
    discountValue: 50000,
    minOrderValue: 500000,
    maxDiscount: null,
    usageLimit: 300,
    perUserLimit: 2,
  },
  {
    code: "VIP15",
    description: "Giảm 15% tối đa 150.000đ cho đơn từ 300.000đ",
    discountType: DiscountType.PERCENT,
    discountValue: 15,
    minOrderValue: 300000,
    maxDiscount: 150000,
    usageLimit: 200,
    perUserLimit: 1,
  },
];

const BANNER_SEEDS: { title: string; imageId: string; linkUrl: string }[] = [
  {
    title: "Bộ sưu tập Hè 2026",
    imageId: "1555529771-835f59fc5efe",
    linkUrl: "/products",
  },
  {
    title: "Ưu đãi cuối tuần — Giảm đến 30%",
    imageId: "1611708314849-8bb91fe0fa56",
    linkUrl: "/products?onSale=1",
  },
  {
    title: "Đồ sơ sinh cotton organic",
    imageId: "1569974641446-22542de88536",
    linkUrl: "/products?category=so-sinh",
  },
];

const CATEGORY_IMAGE_IDS: Record<string, string> = {
  "be-trai": "1502451885777-16c98b07834a",
  "be-gai": "1611708314849-8bb91fe0fa56",
  "so-sinh": "1569974641446-22542de88536",
};

const SAMPLE_SHIPPING_ADDRESSES = [
  {
    recipientName: "Khách Hàng 1",
    phone: "0901234567",
    province: "Thành phố Hồ Chí Minh",
    provinceCode: "79",
    district: "Quận 1",
    districtCode: "760",
    ward: "Phường Bến Nghé",
    wardCode: "26734",
    addressLine: "12 Lý Tự Trọng",
  },
  {
    recipientName: "Khách Hàng 2",
    phone: "0912345678",
    province: "Thành phố Hà Nội",
    provinceCode: "01",
    district: "Quận Hoàn Kiếm",
    districtCode: "002",
    ward: "Phường Hàng Bài",
    wardCode: "00079",
    addressLine: "45 Phố Huế",
  },
];

async function seedReviewers(): Promise<void> {
  console.log("🌱 Seeding reviewer customers...");
  let created = 0;
  for (const r of REVIEWER_SEEDS) {
    const id = await ensureSupabaseUser(r.email, TEST_USER_PASSWORD, r.name);
    await waitForUserRow(id);
    created++;
  }
  console.log(`✅ Đã đảm bảo ${created} khách đánh giá`);
}

async function seedCategoryImages(
  slugToCategoryId: Map<string, string>,
): Promise<void> {
  for (const [slug, imageId] of Object.entries(CATEGORY_IMAGE_IDS)) {
    const id = slugToCategoryId.get(slug);
    if (!id) continue;
    await prisma.category.update({
      where: { id },
      data: {
        imageUrl: unsplashUrl(imageId, "auto=format&fit=crop&w=600&h=600&q=80"),
      },
    });
  }
  console.log("✅ Đã cập nhật ảnh cho danh mục cha");
}

async function seedReviews(customerIds: string[]): Promise<void> {
  const existing = await prisma.review.count();
  if (existing > 0) {
    console.log(`ℹ️  Đã có ${existing} reviews, bỏ qua`);
    return;
  }
  if (customerIds.length === 0) {
    console.log("⚠️  Không có khách để tạo review, bỏ qua");
    return;
  }

  console.log("🌱 Seeding reviews...");
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: { id: true },
  });
  const rng = makeRng("reviews-v1");
  let count = 0;

  for (const p of products) {
    const n = randInt(rng, 0, Math.min(6, customerIds.length));
    const reviewers = pickMany(rng, customerIds, n);
    for (const userId of reviewers) {
      const roll = rng();
      const status =
        roll < 0.78
          ? ReviewStatus.APPROVED
          : roll < 0.93
            ? ReviewStatus.PENDING
            : ReviewStatus.REJECTED;
      const rating =
        status === ReviewStatus.APPROVED
          ? randInt(rng, 4, 5)
          : randInt(rng, 2, 5);
      const comment =
        rating >= 4
          ? pick(rng, REVIEW_COMMENTS_POSITIVE)
          : pick(rng, REVIEW_COMMENTS_NEUTRAL);
      const createdAt = daysAgo(randInt(rng, 1, 60));
      const hasReply = status === ReviewStatus.APPROVED && rng() < 0.25;
      await prisma.review.create({
        data: {
          productId: p.id,
          userId,
          rating,
          title: pick(rng, REVIEW_TITLES),
          comment,
          status,
          isVerified: rng() < 0.7,
          adminReply: hasReply
            ? "Cảm ơn bạn đã tin tưởng Ecokids, chúc bé luôn xinh khỏe!"
            : null,
          repliedAt: hasReply ? createdAt : null,
          createdAt,
        },
      });
      count++;
    }
  }

  // Recompute rating aggregates from APPROVED reviews only.
  const allProducts = await prisma.product.findMany({ select: { id: true } });
  for (const p of allProducts) {
    const agg = await prisma.review.aggregate({
      where: { productId: p.id, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.product.update({
      where: { id: p.id },
      data: {
        ratingAvg: agg._avg.rating
          ? Math.round(agg._avg.rating * 10) / 10
          : 0,
        ratingCount: agg._count._all,
      },
    });
  }

  console.log(`✅ Đã tạo ${count} reviews + cập nhật điểm trung bình sản phẩm`);
}

async function seedVouchers(): Promise<void> {
  console.log("🌱 Seeding vouchers...");
  for (const v of VOUCHER_SEEDS) {
    await prisma.voucher.upsert({
      where: { code: v.code },
      update: {
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minOrderValue: v.minOrderValue,
        maxDiscount: v.maxDiscount,
        usageLimit: v.usageLimit,
        perUserLimit: v.perUserLimit,
        isActive: true,
      },
      create: {
        code: v.code,
        description: v.description,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minOrderValue: v.minOrderValue,
        maxDiscount: v.maxDiscount,
        usageLimit: v.usageLimit,
        perUserLimit: v.perUserLimit,
        startsAt: daysAgo(10),
        endsAt: daysFromNow(50),
        isActive: true,
      },
    });
  }
  console.log(`✅ Đã tạo/cập nhật ${VOUCHER_SEEDS.length} vouchers`);
}

async function seedFlashSale(): Promise<void> {
  const name = "Flash Sale Hè 2026";
  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    orderBy: { basePrice: "desc" },
    take: 6,
    select: { id: true, basePrice: true },
  });
  const saleItemData = products.map((p) => ({
    productId: p.id,
    salePrice: Math.round((p.basePrice * 0.7) / 1000) * 1000,
  }));

  // Re-activate the existing sale (manually created earlier) so it's running
  // for screenshots, instead of skipping a possibly-expired one.
  const existing = await prisma.flashSale.findFirst({
    where: { name },
    include: { items: true },
  });
  if (existing) {
    await prisma.flashSale.update({
      where: { id: existing.id },
      data: { startsAt: daysAgo(2), endsAt: daysFromNow(5), isActive: true },
    });
    if (existing.items.length === 0 && saleItemData.length > 0) {
      await prisma.flashSaleItem.createMany({
        data: saleItemData.map((it) => ({ ...it, flashSaleId: existing.id })),
        skipDuplicates: true,
      });
    }
    console.log("ℹ️  Flash sale đã tồn tại — đã cập nhật thời gian chạy");
    return;
  }

  if (products.length === 0) {
    console.log("⚠️  Không có sản phẩm cho flash sale, bỏ qua");
    return;
  }

  await prisma.flashSale.create({
    data: {
      name,
      startsAt: daysAgo(2),
      endsAt: daysFromNow(5),
      isActive: true,
      items: { create: saleItemData },
    },
  });
  console.log(`✅ Đã tạo flash sale "${name}" với ${products.length} sản phẩm`);
}

async function seedBanners(): Promise<void> {
  console.log("🌱 Seeding banners...");
  let created = 0;
  for (let i = 0; i < BANNER_SEEDS.length; i++) {
    const b = BANNER_SEEDS[i]!;
    const exists = await prisma.banner.findFirst({ where: { title: b.title } });
    if (exists) continue;
    await prisma.banner.create({
      data: {
        title: b.title,
        imageUrl: unsplashUrl(
          b.imageId,
          "auto=format&fit=crop&w=1200&h=450&q=80",
        ),
        linkUrl: b.linkUrl,
        sortOrder: i,
        isActive: true,
      },
    });
    created++;
  }
  console.log(`✅ Đã tạo ${created} banners mới`);
}

async function seedWishlist(customerIds: string[]): Promise<void> {
  const existing = await prisma.wishlistItem.count();
  if (existing >= 4) {
    console.log(`ℹ️  Đã có ${existing} wishlist items (đủ), bỏ qua`);
    return;
  }
  const userId = customerIds[0];
  if (!userId) return;

  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    take: 12,
    select: { id: true },
  });
  const rng = makeRng("wishlist-v1");
  const chosen = pickMany(rng, products, Math.min(6, products.length));
  const res = await prisma.wishlistItem.createMany({
    data: chosen.map((p) => ({ userId, productId: p.id })),
    skipDuplicates: true,
  });
  console.log(`✅ Đã thêm ${res.count} wishlist items cho khách đầu tiên`);
}

const ORDER_STATUS_PLAN: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.COMPLETED,
  OrderStatus.COMPLETED,
  OrderStatus.COMPLETED,
  OrderStatus.COMPLETED,
  OrderStatus.COMPLETED,
  OrderStatus.SHIPPING,
  OrderStatus.SHIPPING,
  OrderStatus.PACKING,
  OrderStatus.PACKING,
  OrderStatus.CONFIRMED,
  OrderStatus.CONFIRMED,
  OrderStatus.PENDING,
  OrderStatus.PENDING,
  OrderStatus.CANCELED,
  OrderStatus.CANCELED,
  OrderStatus.COMPLETED,
  OrderStatus.SHIPPING,
];

async function nextOrderCode(year: number): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    `SELECT nextval('order_code_seq_${year}') AS nextval`,
  );
  const seq = rows[0]?.nextval ?? BigInt(0);
  return `ECO-${year}-${String(seq).padStart(6, "0")}`;
}

async function seedOrders(customerIds: string[]): Promise<void> {
  const existing = await prisma.order.count();
  if (existing >= 12) {
    console.log(`ℹ️  Đã có ${existing} orders (đủ), bỏ qua`);
    return;
  }
  if (customerIds.length === 0) {
    console.log("⚠️  Không có khách để tạo đơn hàng, bỏ qua");
    return;
  }

  console.log("🌱 Seeding orders...");
  const year = new Date().getFullYear();
  await prisma.$executeRawUnsafe(
    `CREATE SEQUENCE IF NOT EXISTS order_code_seq_${year}`,
  );

  const products = await prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE, variants: { some: {} } },
    select: {
      id: true,
      slug: true,
      name: true,
      basePrice: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      variants: { select: { id: true, size: true, color: true, price: true } },
    },
  });
  if (products.length === 0) {
    console.log("⚠️  Không có sản phẩm cho đơn hàng, bỏ qua");
    return;
  }

  const welcome = await prisma.voucher.findUnique({
    where: { code: "WELCOME10" },
  });
  const rng = makeRng("orders-v1");
  let created = 0;

  for (const status of ORDER_STATUS_PLAN) {
    const userId = pick(rng, customerIds);
    const nItems = randInt(rng, 1, 3);
    const chosen = pickMany(rng, products, nItems);

    const items = chosen.map((pr) => {
      const variant = pick(rng, pr.variants);
      const unitPrice = variant.price ?? pr.basePrice;
      const quantity = randInt(rng, 1, 2);
      return {
        variantId: variant.id,
        productName: pr.name,
        productSlug: pr.slug,
        productImage: pr.images[0]?.url ?? null,
        variantSize: variant.size,
        variantColor: variant.color,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      };
    });

    const subtotal = items.reduce((s, it) => s + it.subtotal, 0);
    const shippingFee = subtotal >= 500000 ? 0 : 30000;

    let discountTotal = 0;
    let voucherCode: string | null = null;
    let applyVoucher = false;
    if (welcome && status === OrderStatus.COMPLETED && rng() < 0.4) {
      const raw = Math.round((subtotal * welcome.discountValue) / 100);
      discountTotal = welcome.maxDiscount
        ? Math.min(raw, welcome.maxDiscount)
        : raw;
      voucherCode = welcome.code;
      applyVoucher = true;
    }
    const total = subtotal + shippingFee - discountTotal;

    const paymentMethod =
      rng() < 0.5 ? PaymentMethod.COD : PaymentMethod.PAYOS;
    const createdDays = randInt(rng, 1, 35);
    const createdAt = daysAgo(createdDays);

    let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
    let paidAt: Date | null = null;
    let completedAt: Date | null = null;
    let canceledAt: Date | null = null;
    let trackingCode: string | null = null;
    const tracking = `VN${100000 + randInt(rng, 0, 899999)}`;

    if (status === OrderStatus.CANCELED) {
      canceledAt = daysAgo(Math.max(0, createdDays - 1));
    } else if (status === OrderStatus.COMPLETED) {
      paymentStatus = PaymentStatus.PAID;
      paidAt = createdAt;
      completedAt = daysAgo(Math.max(0, createdDays - 3));
      trackingCode = tracking;
    } else if (
      status === OrderStatus.SHIPPING ||
      status === OrderStatus.PACKING
    ) {
      trackingCode = status === OrderStatus.SHIPPING ? tracking : null;
      if (paymentMethod === PaymentMethod.PAYOS) {
        paymentStatus = PaymentStatus.PAID;
        paidAt = createdAt;
      }
    } else if (
      status === OrderStatus.CONFIRMED &&
      paymentMethod === PaymentMethod.PAYOS
    ) {
      paymentStatus = PaymentStatus.PAID;
      paidAt = createdAt;
    }

    const orderCode = await nextOrderCode(year);
    const order = await prisma.order.create({
      select: { id: true },
      data: {
        orderCode,
        userId,
        status,
        paymentMethod,
        paymentStatus,
        subtotal,
        shippingFee,
        discountTotal,
        voucherCode,
        total,
        trackingCode,
        shippingAddress: pick(rng, SAMPLE_SHIPPING_ADDRESSES),
        createdAt,
        paidAt,
        completedAt,
        canceledAt,
        items: { create: items },
      },
    });

    if (applyVoucher && welcome) {
      await prisma.voucherRedemption.create({
        data: {
          voucherId: welcome.id,
          userId,
          orderId: order.id,
          discount: discountTotal,
        },
      });
      await prisma.voucher.update({
        where: { id: welcome.id },
        data: { usageCount: { increment: 1 } },
      });
    }
    created++;
  }

  console.log(`✅ Đã tạo ${created} orders`);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log("🚀 Bắt đầu seed dữ liệu Ecokids...\n");

  await seedUsers();
  await seedReviewers();
  const categoryMap = await seedCategories();
  await seedCategoryImages(categoryMap);
  await seedProducts(categoryMap);

  const customerIds = (
    await prisma.user.findMany({
      where: { role: UserRole.USER },
      select: { id: true },
    })
  ).map((u) => u.id);

  await seedReviews(customerIds);
  await seedVouchers();
  await seedFlashSale();
  await seedOrders(customerIds);
  await seedBanners();
  await seedWishlist(customerIds);

  console.log("\n🎉 Seed hoàn tất!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("❌ Seed thất bại:", err);
    await prisma.$disconnect();
    process.exit(1);
  });

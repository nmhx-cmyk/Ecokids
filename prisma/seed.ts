import {
  PrismaClient,
  UserRole,
  Gender,
  AgeRange,
  ProductStatus,
} from "@prisma/client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log(
      `ℹ️  Đã có ${existing} products trong DB, bỏ qua bước seed products`,
    );
    return;
  }

  console.log("🌱 Seeding products...");
  const outOfStockSkus: string[] = [];

  for (const seed of PRODUCT_SEEDS) {
    const categoryId = slugToCategoryId.get(seed.categorySlug);
    if (!categoryId) {
      throw new Error(`Category not found: ${seed.categorySlug}`);
    }

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

    // Images: 2-3 picsum, seeded deterministically by slug
    const imageCount = randInt(rng, 2, 3);
    for (let i = 0; i < imageCount; i++) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `https://picsum.photos/seed/${seed.slug}-${i + 1}/600/750.webp`,
          alt: `${seed.name} - ảnh ${i + 1}`,
          sortOrder: i,
          isPrimary: i === 0,
        },
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

  console.log(`✅ Đã tạo ${PRODUCT_SEEDS.length} products`);
  if (outOfStockSkus.length > 0) {
    console.log(
      `📦 Variants out-of-stock (test UI hết hàng): ${outOfStockSkus.join(", ")}`,
    );
  } else {
    console.log("ℹ️  Không có variant nào out-of-stock lần seed này");
  }
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  console.log("🚀 Bắt đầu seed dữ liệu Ecokids...\n");

  await seedUsers();
  const categoryMap = await seedCategories();
  await seedProducts(categoryMap);

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

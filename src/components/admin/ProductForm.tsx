"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useFieldArray,
  useForm,
  type SubmitHandler,
} from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AgeRange, Gender, ProductStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";
import { Select, Option } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  VariantQuickAddDialog,
  type QuickVariantSeed,
} from "@/components/admin/VariantQuickAddDialog";
import { AGE_RANGE_LABELS } from "@/lib/constants/age-ranges";
import { GENDER_LABELS } from "@/lib/constants/gender";
import {
  createProduct,
  updateProduct,
} from "@/lib/server/products";
import { productSchema, variantSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils/slug";
import { cn } from "@/lib/utils/cn";

// ============================================
// Form schema (mirror of server schema, with id fields for nested rows)
// ============================================

const formImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url("URL ảnh không hợp lệ"),
  alt: z.string().max(255).default(""),
  sortOrder: z.number().int().min(0).optional(),
  isPrimary: z.boolean().default(false),
});

const formVariantSchema = variantSchema.extend({
  id: z.string().optional(),
  sku: z.string().max(64).optional(),
});

const formSchema = productSchema.and(
  z.object({
    images: z
      .array(formImageSchema)
      .min(1, "Cần ít nhất 1 ảnh sản phẩm")
      .max(10, "Tối đa 10 ảnh"),
    variants: z.array(formVariantSchema).min(1, "Cần ít nhất 1 biến thể"),
  }),
);

type FormValues = z.infer<typeof formSchema>;

// ============================================
// Constants
// ============================================

const AGE_RANGE_VALUES: AgeRange[] = [
  AgeRange.NEWBORN_0_1,
  AgeRange.TODDLER_1_3,
  AgeRange.KID_3_6,
  AgeRange.KID_6_12,
];

const GENDER_VALUES: Gender[] = [Gender.BOY, Gender.GIRL, Gender.UNISEX];

const STATUS_VALUES: ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.ACTIVE,
  ProductStatus.ARCHIVED,
];

const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Nháp",
  ACTIVE: "Đang bán",
  ARCHIVED: "Lưu trữ",
};

// ============================================
// Props
// ============================================

export interface CategoryOption {
  id: string;
  name: string;
  depth: number;
}

export interface ProductInitialData {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  ageRange: AgeRange[];
  gender: Gender;
  basePrice: number;
  comparePrice: number | null;
  status: ProductStatus;
  material: string | null;
  origin: string | null;
  careGuide: string | null;
  images: Array<{
    id: string;
    url: string;
    alt: string;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  variants: Array<{
    id: string;
    sku: string;
    size: string;
    sizeNote: string | null;
    color: string;
    colorHex: string | null;
    price: number | null;
    stock: number;
  }>;
}

type ProductFormProps =
  | {
      mode: "create";
      categories: CategoryOption[];
      initialData?: undefined;
    }
  | {
      mode: "edit";
      categories: CategoryOption[];
      initialData: ProductInitialData;
    };

// ============================================
// Helpers
// ============================================

function buildSku(productSlug: string, size: string, color: string): string {
  const parts = [
    slugify(productSlug).toUpperCase(),
    slugify(size).toUpperCase(),
    slugify(color).toUpperCase(),
  ].filter((p) => p.length > 0);
  return parts.join("-");
}

function emptyVariant(): FormValues["variants"][number] {
  return {
    sku: "",
    size: "",
    sizeNote: "",
    color: "",
    colorHex: undefined,
    price: undefined,
    stock: 0,
  };
}

function defaultValuesForCreate(categories: CategoryOption[]): FormValues {
  return {
    name: "",
    slug: "",
    description: "",
    categoryId: categories[0]?.id ?? "",
    ageRange: [],
    gender: Gender.UNISEX,
    basePrice: 0,
    comparePrice: undefined,
    status: ProductStatus.DRAFT,
    material: "",
    origin: "",
    careGuide: "",
    images: [],
    variants: [emptyVariant()],
  };
}

function defaultValuesForEdit(initial: ProductInitialData): FormValues {
  return {
    name: initial.name,
    slug: initial.slug,
    description: initial.description,
    categoryId: initial.categoryId,
    ageRange: initial.ageRange,
    gender: initial.gender,
    basePrice: initial.basePrice,
    comparePrice: initial.comparePrice ?? undefined,
    status: initial.status,
    material: initial.material ?? "",
    origin: initial.origin ?? "",
    careGuide: initial.careGuide ?? "",
    images: initial.images
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })),
    variants: initial.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      sizeNote: v.sizeNote ?? "",
      color: v.color,
      colorHex: v.colorHex ?? undefined,
      price: v.price ?? undefined,
      stock: v.stock,
    })),
  };
}

// ============================================
// Component
// ============================================

export function ProductForm(props: ProductFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      props.mode === "edit"
        ? defaultValuesForEdit(props.initialData)
        : defaultValuesForCreate(props.categories),
    mode: "onSubmit",
  });

  const [topLevelError, setTopLevelError] = React.useState<string | null>(null);
  const [slugTouched, setSlugTouched] = React.useState(isEdit);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  // Auto-derive slug from name until user edits it.
  const nameValue = watch("name");
  React.useEffect(() => {
    if (slugTouched) return;
    const derived = slugify(nameValue ?? "");
    setValue("slug", derived, { shouldValidate: false });
  }, [nameValue, slugTouched, setValue]);

  const imagesField = useFieldArray({ control, name: "images" });
  const variantsField = useFieldArray({ control, name: "variants" });

  const watchedImages = watch("images");
  const watchedVariants = watch("variants");
  const watchedSlug = watch("slug");

  // ============================================
  // Image handlers
  // ============================================

  const handleImageUploaded = (url: string) => {
    if (imagesField.fields.length >= 10) {
      toast.error("Tối đa 10 ảnh.");
      return;
    }
    const isFirst = imagesField.fields.length === 0;
    imagesField.append({
      url,
      alt: "",
      sortOrder: imagesField.fields.length,
      isPrimary: isFirst,
    });
  };

  const handleSetPrimary = (index: number) => {
    const current = getValues("images");
    current.forEach((_, i) => {
      setValue(`images.${i}.isPrimary`, i === index, { shouldDirty: true });
    });
  };

  const handleMoveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= imagesField.fields.length) return;
    imagesField.move(index, target);
    // Recalculate sortOrder.
    const updated = getValues("images");
    updated.forEach((_, i) => {
      setValue(`images.${i}.sortOrder`, i, { shouldDirty: true });
    });
  };

  // ============================================
  // Variant handlers
  // ============================================

  const handleAddVariant = () => {
    variantsField.append(emptyVariant());
  };

  const handleSkuAutoFill = (index: number) => {
    const variant = getValues(`variants.${index}`);
    if (variant.sku && variant.sku.length > 0) return;
    if (!variant.size || !variant.color) return;
    const slugBase = watchedSlug || slugify(getValues("name") ?? "");
    if (!slugBase) return;
    setValue(`variants.${index}.sku`, buildSku(slugBase, variant.size, variant.color), {
      shouldDirty: true,
    });
  };

  const handleQuickAddApply = (seeds: QuickVariantSeed[]) => {
    const slugBase = watchedSlug || slugify(getValues("name") ?? "");
    // Drop the initial empty placeholder if it's untouched.
    const current = getValues("variants");
    const onlyPlaceholder =
      current.length === 1 &&
      !current[0]?.size &&
      !current[0]?.color &&
      !current[0]?.sku;
    if (onlyPlaceholder) {
      variantsField.remove(0);
    }
    for (const seed of seeds) {
      variantsField.append({
        sku: slugBase ? buildSku(slugBase, seed.size, seed.color) : "",
        size: seed.size,
        sizeNote: "",
        color: seed.color,
        colorHex: seed.colorHex,
        price: undefined,
        stock: seed.stock,
      });
    }
    toast.success(`Đã tạo ${seeds.length} biến thể.`);
  };

  const existingVariantKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const v of watchedVariants ?? []) {
      if (v.size && v.color) {
        set.add(`${v.size.toLowerCase()}__${v.color.toLowerCase()}`);
      }
    }
    return set;
  }, [watchedVariants]);

  // ============================================
  // Submit
  // ============================================

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setTopLevelError(null);

    // Normalize empty strings on optional fields.
    const payload = {
      ...values,
      slug: values.slug || slugify(values.name),
      material: values.material?.trim() || undefined,
      origin: values.origin?.trim() || undefined,
      careGuide: values.careGuide?.trim() || undefined,
      comparePrice:
        values.comparePrice && values.comparePrice > 0
          ? values.comparePrice
          : undefined,
      images: values.images.map((img, idx) => ({
        id: img.id,
        url: img.url,
        alt: img.alt ?? "",
        sortOrder: idx,
        isPrimary: img.isPrimary,
      })),
      variants: values.variants.map((v) => ({
        ...v,
        sizeNote: v.sizeNote?.trim() || undefined,
        colorHex: v.colorHex?.trim() || undefined,
        price: v.price && v.price > 0 ? v.price : undefined,
      })),
    };

    const result =
      props.mode === "edit"
        ? await updateProduct(props.initialData.id, payload)
        : await createProduct(payload);

    if (!result.ok) {
      setTopLevelError(result.error.message);
      toast.error(result.error.message);
      return;
    }

    toast.success(
      props.mode === "edit" ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm.",
    );
    router.push("/admin/products");
    router.refresh();
  };

  // ============================================
  // Render
  // ============================================

  const categories = props.categories;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-24"
      noValidate
    >
      {topLevelError ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-red-50 px-4 py-3 text-sm text-danger"
        >
          {topLevelError}
        </div>
      ) : null}

      {/* Section 1 — Thông tin cơ bản */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin cơ bản</CardTitle>
          <CardDescription>
            Tên sản phẩm, mô tả, danh mục và đối tượng phù hợp.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Tên sản phẩm"
            htmlFor="name"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              {...register("name")}
              error={Boolean(errors.name)}
              placeholder="Áo thun cotton hữu cơ cho bé"
            />
          </FormField>

          <FormField
            label="Slug"
            htmlFor="slug"
            required
            hint="Dùng trong URL công khai. Mặc định đồng bộ từ tên."
            error={errors.slug?.message}
          >
            <div className="flex gap-2">
              <Input
                id="slug"
                {...register("slug", {
                  onChange: () => setSlugTouched(true),
                })}
                error={Boolean(errors.slug)}
                placeholder="ao-thun-cotton-huu-co"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const derived = slugify(getValues("name") ?? "");
                  setValue("slug", derived, { shouldValidate: false });
                  setSlugTouched(false);
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Đồng bộ từ tên
              </Button>
            </div>
          </FormField>

          <FormField
            label="Mô tả"
            htmlFor="description"
            required
            error={errors.description?.message}
          >
            <Textarea
              id="description"
              rows={6}
              {...register("description")}
              error={Boolean(errors.description)}
              placeholder="Mô tả chi tiết về sản phẩm, chất liệu, điểm nổi bật..."
            />
          </FormField>

          <FormField
            label="Danh mục"
            htmlFor="categoryId"
            required
            error={errors.categoryId?.message}
          >
            <Select
              id="categoryId"
              {...register("categoryId")}
              error={Boolean(errors.categoryId)}
            >
              <Option value="">— Chọn danh mục —</Option>
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.id}>
                  {"  ".repeat(cat.depth)}
                  {cat.depth > 0 ? "└ " : ""}
                  {cat.name}
                </Option>
              ))}
            </Select>
          </FormField>

          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <FormField
                label="Giới tính"
                required
                error={errors.gender?.message}
              >
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as Gender)}
                  className="flex flex-wrap gap-4"
                >
                  {GENDER_VALUES.map((g) => {
                    const id = `gender-${g}`;
                    return (
                      <label
                        key={g}
                        htmlFor={id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <RadioGroupItem value={g} id={id} />
                        <span className="text-sm text-ink-700">
                          {GENDER_LABELS[g]}
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="ageRange"
            render={({ field }) => (
              <FormField
                label="Độ tuổi phù hợp"
                required
                hint="Chọn ít nhất 1 độ tuổi."
                error={errors.ageRange?.message as string | undefined}
              >
                <div className="flex flex-wrap gap-4">
                  {AGE_RANGE_VALUES.map((age) => {
                    const id = `age-${age}`;
                    const checked = field.value?.includes(age) ?? false;
                    return (
                      <label
                        key={age}
                        htmlFor={id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={(state) => {
                            const next = state === true;
                            const current = field.value ?? [];
                            field.onChange(
                              next
                                ? Array.from(new Set([...current, age]))
                                : current.filter((a) => a !== age),
                            );
                          }}
                        />
                        <span className="text-sm text-ink-700">
                          {AGE_RANGE_LABELS[age]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <FormField
                label="Trạng thái"
                required
                error={errors.status?.message}
              >
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as ProductStatus)}
                  className="flex flex-wrap gap-4"
                >
                  {STATUS_VALUES.map((s) => {
                    const id = `status-${s}`;
                    return (
                      <label
                        key={s}
                        htmlFor={id}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <RadioGroupItem value={s} id={id} />
                        <span className="text-sm text-ink-700">
                          {STATUS_LABELS[s]}
                        </span>
                      </label>
                    );
                  })}
                </RadioGroup>
              </FormField>
            )}
          />
        </CardContent>
      </Card>

      {/* Section 2 — Giá */}
      <Card>
        <CardHeader>
          <CardTitle>Giá bán</CardTitle>
          <CardDescription>
            Giá hiển thị mặc định cho sản phẩm. Mỗi biến thể có thể ghi đè riêng.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Giá bán"
            htmlFor="basePrice"
            required
            error={errors.basePrice?.message}
          >
            <div className="relative">
              <Input
                id="basePrice"
                type="number"
                min={0}
                step={1000}
                {...register("basePrice", { valueAsNumber: true })}
                error={Boolean(errors.basePrice)}
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                VND
              </span>
            </div>
          </FormField>

          <FormField
            label="Giá so sánh"
            htmlFor="comparePrice"
            hint="Hiển thị gạch ngang lên giá gốc — phải lớn hơn giá bán."
            error={errors.comparePrice?.message}
          >
            <div className="relative">
              <Input
                id="comparePrice"
                type="number"
                min={0}
                step={1000}
                {...register("comparePrice", {
                  setValueAs: (v) =>
                    v === "" || v === null || v === undefined
                      ? undefined
                      : Number(v),
                })}
                error={Boolean(errors.comparePrice)}
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-500">
                VND
              </span>
            </div>
          </FormField>
        </CardContent>
      </Card>

      {/* Section 3 — Ảnh */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Hình ảnh</CardTitle>
              <CardDescription>
                Tối đa 10 ảnh. Ảnh đầu tiên mặc định là ảnh đại diện.
              </CardDescription>
            </div>
            <Badge variant="default">
              {imagesField.fields.length}/10
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.images?.message ? (
            <p className="text-xs text-danger">{errors.images.message}</p>
          ) : null}

          {imagesField.fields.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {imagesField.fields.map((field, index) => {
                const img = watchedImages?.[index];
                return (
                  <div
                    key={field.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border border-ink-200 bg-white p-2",
                      img?.isPrimary && "border-coral-500 ring-1 ring-coral-500",
                    )}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-cream-100">
                      {img?.url ? (
                        <Image
                          src={img.url}
                          alt={img.alt || "Ảnh sản phẩm"}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                        />
                      ) : null}
                      {img?.isPrimary ? (
                        <Badge
                          variant="coral"
                          className="absolute left-2 top-2"
                        >
                          Ảnh đại diện
                        </Badge>
                      ) : null}
                    </div>

                    <Input
                      placeholder="Mô tả ảnh (alt)"
                      {...register(`images.${index}.alt` as const)}
                      className="h-8 text-xs"
                    />

                    <div className="flex items-center justify-between gap-1">
                      <label className="flex cursor-pointer items-center gap-1 text-xs text-ink-700">
                        <input
                          type="radio"
                          name="primaryImage"
                          checked={Boolean(img?.isPrimary)}
                          onChange={() => handleSetPrimary(index)}
                          className="h-3 w-3 accent-coral-500"
                        />
                        Ảnh chính
                      </label>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveImage(index, -1)}
                          disabled={index === 0}
                          aria-label="Di chuyển lên"
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveImage(index, 1)}
                          disabled={index === imagesField.fields.length - 1}
                          aria-label="Di chuyển xuống"
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-danger hover:text-danger"
                          onClick={() => {
                            const wasPrimary = img?.isPrimary;
                            imagesField.remove(index);
                            if (wasPrimary) {
                              const remaining = getValues("images");
                              if (remaining.length > 0) {
                                setValue(`images.0.isPrimary`, true, {
                                  shouldDirty: true,
                                });
                              }
                            }
                          }}
                          aria-label="Xoá ảnh"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {imagesField.fields.length < 10 ? (
            <div className="rounded-lg border border-dashed border-ink-200 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-ink-700">
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                Thêm ảnh sản phẩm
              </div>
              <ImageUploadField
                value={null}
                onChange={(url) => {
                  if (url) handleImageUploaded(url);
                }}
                bucket="product-images"
                pathPrefix="products"
                label="Tải ảnh lên"
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Section 4 — Biến thể */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Biến thể (Size × Màu)</CardTitle>
              <CardDescription>
                Mỗi tổ hợp size – màu là một SKU riêng.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setQuickAddOpen(true)}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Tạo nhanh từ Size × Màu
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariant}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Thêm biến thể
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errors.variants?.message ? (
            <p className="text-xs text-danger">{errors.variants.message}</p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink-200 text-left text-xs font-medium uppercase tracking-wide text-ink-500">
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Size</th>
                  <th className="px-2 py-2">Chi tiết size</th>
                  <th className="px-2 py-2">Màu</th>
                  <th className="px-2 py-2">Hex</th>
                  <th className="px-2 py-2">Giá override</th>
                  <th className="px-2 py-2">Tồn kho</th>
                  <th className="px-2 py-2" aria-label="Xoá" />
                </tr>
              </thead>
              <tbody>
                {variantsField.fields.map((field, index) => {
                  const variantErr = errors.variants?.[index];
                  const hex = watchedVariants?.[index]?.colorHex;
                  return (
                    <tr
                      key={field.id}
                      className="border-b border-ink-200/60 last:border-b-0"
                    >
                      <td className="px-2 py-2 align-top">
                        <Input
                          {...register(`variants.${index}.sku` as const)}
                          placeholder="Tự sinh"
                          className="h-9 min-w-[140px] text-xs"
                          error={Boolean(variantErr?.sku)}
                        />
                        {variantErr?.sku ? (
                          <p className="mt-1 text-xs text-danger">
                            {variantErr.sku.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Input
                          {...register(`variants.${index}.size` as const, {
                            onBlur: () => handleSkuAutoFill(index),
                          })}
                          placeholder="2T"
                          className="h-9 w-24 text-sm"
                          error={Boolean(variantErr?.size)}
                        />
                        {variantErr?.size ? (
                          <p className="mt-1 text-xs text-danger">
                            {variantErr.size.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Input
                          {...register(`variants.${index}.sizeNote` as const)}
                          placeholder="95-100cm, 14-16kg"
                          className="h-9 min-w-[160px] text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Input
                          {...register(`variants.${index}.color` as const, {
                            onBlur: () => handleSkuAutoFill(index),
                          })}
                          placeholder="Trắng"
                          className="h-9 w-28 text-sm"
                          error={Boolean(variantErr?.color)}
                        />
                        {variantErr?.color ? (
                          <p className="mt-1 text-xs text-danger">
                            {variantErr.color.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <Input
                            {...register(`variants.${index}.colorHex` as const, {
                              setValueAs: (v) =>
                                typeof v === "string" && v.trim() === ""
                                  ? undefined
                                  : v,
                            })}
                            placeholder="#FFFFFF"
                            className="h-9 w-24 text-xs"
                            error={Boolean(variantErr?.colorHex)}
                          />
                          {hex ? (
                            <span
                              aria-hidden="true"
                              className="inline-block h-5 w-5 rounded border border-ink-200"
                              style={{ backgroundColor: hex }}
                            />
                          ) : null}
                        </div>
                        {variantErr?.colorHex ? (
                          <p className="mt-1 text-xs text-danger">
                            {variantErr.colorHex.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Input
                          type="number"
                          min={0}
                          step={1000}
                          {...register(`variants.${index}.price` as const, {
                            setValueAs: (v) =>
                              v === "" || v === null || v === undefined
                                ? undefined
                                : Number(v),
                          })}
                          placeholder="Mặc định"
                          className="h-9 w-32 text-sm"
                          error={Boolean(variantErr?.price)}
                        />
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          {...register(`variants.${index}.stock` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-9 w-24 text-sm"
                          error={Boolean(variantErr?.stock)}
                        />
                        {variantErr?.stock ? (
                          <p className="mt-1 text-xs text-danger">
                            {variantErr.stock.message}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-danger hover:text-danger"
                          onClick={() => variantsField.remove(index)}
                          disabled={variantsField.fields.length === 1}
                          aria-label="Xoá biến thể"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 5 — Thông số sản phẩm */}
      <Card>
        <CardHeader>
          <CardTitle>Thông số sản phẩm</CardTitle>
          <CardDescription>
            Thông tin tham khảo, hiển thị ở phần mô tả mở rộng.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Chất liệu"
              htmlFor="material"
              error={errors.material?.message}
            >
              <Input
                id="material"
                {...register("material")}
                placeholder="Cotton 100%"
                error={Boolean(errors.material)}
              />
            </FormField>

            <FormField
              label="Xuất xứ"
              htmlFor="origin"
              error={errors.origin?.message}
            >
              <Input
                id="origin"
                {...register("origin")}
                placeholder="Việt Nam"
                error={Boolean(errors.origin)}
              />
            </FormField>
          </div>

          <FormField
            label="Hướng dẫn giặt"
            htmlFor="careGuide"
            error={errors.careGuide?.message}
          >
            <Textarea
              id="careGuide"
              rows={4}
              {...register("careGuide")}
              placeholder="Giặt máy ở 30°C, không sấy, ủi ở nhiệt độ thấp..."
              error={Boolean(errors.careGuide)}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/products")}
            disabled={isSubmitting}
          >
            Huỷ
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEdit ? "Lưu thay đổi" : "Lưu sản phẩm"}
          </Button>
        </div>
      </div>

      <VariantQuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        existingKeys={existingVariantKeys}
        onApply={handleQuickAddApply}
      />
    </form>
  );
}

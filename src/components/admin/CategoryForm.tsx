'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createCategory, updateCategory } from '@/lib/server/categories';
import type { CategoryFlat } from '@/lib/queries/categories';
import { slugify } from '@/lib/utils/slug';
import {
  categorySchema,
  type CategoryInput,
} from '@/lib/validations/category';

type Mode = 'create' | 'edit';

export interface CategoryFormProps {
  mode: Mode;
  allCategories: CategoryFlat[];
  currentId?: string;
  initialData?: {
    name: string;
    slug: string;
    parentId: string | null;
    imageUrl: string | null;
    sortOrder: number;
  };
}

function collectDescendantIds(
  rootId: string,
  flat: CategoryFlat[],
): Set<string> {
  const result = new Set<string>();
  let frontier = new Set<string>([rootId]);
  while (frontier.size > 0) {
    const next = new Set<string>();
    for (const node of flat) {
      if (node.parentId && frontier.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id);
        next.add(node.id);
      }
    }
    frontier = next;
  }
  return result;
}

export function CategoryForm({
  mode,
  allCategories,
  currentId,
  initialData,
}: CategoryFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const slugManuallyEdited = useRef(mode === 'edit');

  const blockedIds = useMemo(() => {
    if (!currentId) return new Set<string>();
    const descendants = collectDescendantIds(currentId, allCategories);
    descendants.add(currentId);
    return descendants;
  }, [currentId, allCategories]);

  const parentOptions = useMemo(
    () =>
      allCategories
        .filter((c) => !blockedIds.has(c.id))
        .map((c) => ({
          id: c.id,
          label: `${'— '.repeat(c.depth)}${c.name}`,
        })),
    [allCategories, blockedIds],
  );

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    setError,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      parentId: initialData?.parentId ?? null,
      imageUrl: initialData?.imageUrl ?? null,
      sortOrder: initialData?.sortOrder ?? 0,
    },
  });

  const [imageUrl, setImageUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );

  function onNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setValue('name', value, { shouldValidate: true });
    if (!slugManuallyEdited.current) {
      setValue('slug', slugify(value), { shouldValidate: true });
    }
  }

  function onSlugChange(event: React.ChangeEvent<HTMLInputElement>) {
    slugManuallyEdited.current = true;
    setValue('slug', event.target.value, { shouldValidate: true });
  }

  function resyncSlug() {
    const name = getValues('name');
    setValue('slug', slugify(name), { shouldValidate: true });
    slugManuallyEdited.current = false;
  }

  function onSubmit(values: CategoryInput) {
    startTransition(async () => {
      const payload: CategoryInput = { ...values, imageUrl };
      const result =
        mode === 'create'
          ? await createCategory(payload)
          : await updateCategory(currentId ?? '', payload);

      if (result.ok) {
        toast.success(
          mode === 'create' ? 'Đã tạo danh mục' : 'Đã cập nhật danh mục',
        );
        router.push('/admin/categories');
        router.refresh();
        return;
      }

      const field = result.error.field as
        | keyof CategoryInput
        | undefined;
      if (field) {
        setError(field, { message: result.error.message });
      } else {
        setError('root', { message: result.error.message });
      }
      toast.error(result.error.message);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-2xl flex-col gap-6 pb-24 lg:pb-0"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle>Thông tin danh mục</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormField
            label="Tên danh mục"
            htmlFor="category-name"
            required
            error={errors.name?.message}
          >
            <Input
              id="category-name"
              autoComplete="off"
              {...register('name')}
              onChange={onNameChange}
              error={!!errors.name}
              placeholder="Ví dụ: Áo thun"
            />
          </FormField>

          <FormField
            label="Slug"
            htmlFor="category-slug"
            required
            error={errors.slug?.message}
            hint="Dùng cho URL. Chỉ chữ thường, số và dấu gạch ngang."
          >
            <div className="flex items-center gap-2">
              <Input
                id="category-slug"
                autoComplete="off"
                {...register('slug')}
                onChange={onSlugChange}
                error={!!errors.slug}
                className="font-mono"
                placeholder="ao-thun"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resyncSlug}
              >
                Cập nhật từ tên
              </Button>
            </div>
          </FormField>

          <FormField
            label="Danh mục cha"
            htmlFor="category-parent"
            error={errors.parentId?.message}
            hint="Để trống nếu đây là danh mục gốc."
          >
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <Select
                  id="category-parent"
                  value={field.value ?? ''}
                  onChange={(event) =>
                    field.onChange(event.target.value || null)
                  }
                  error={!!errors.parentId}
                >
                  <option value="">Không có (danh mục gốc)</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Thứ tự sắp xếp"
            htmlFor="category-sort"
            error={errors.sortOrder?.message}
            hint="Số nhỏ hiển thị trước. Mặc định 0."
          >
            <Input
              id="category-sort"
              type="number"
              min={0}
              step={1}
              {...register('sortOrder', { valueAsNumber: true })}
              error={!!errors.sortOrder}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hình ảnh danh mục</CardTitle>
        </CardHeader>
        <CardContent>
          <ImageUploadField
            value={imageUrl}
            onChange={setImageUrl}
            bucket="categories"
            pathPrefix="categories"
            label="Ảnh đại diện"
            aspectRatio={4 / 5}
            disabled={isPending}
          />
        </CardContent>
      </Card>

      {errors.root?.message ? (
        <p className="rounded-md border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      ) : null}

      <div className="hidden items-center justify-end gap-2 lg:flex">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/categories')}
          disabled={isPending}
        >
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi'}
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-end gap-2 border-t border-ink-200 bg-white px-4 py-3 lg:hidden">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/categories')}
          disabled={isPending}
        >
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {mode === 'create' ? 'Tạo' : 'Lưu'}
        </Button>
      </div>
    </form>
  );
}

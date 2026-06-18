"use client";

import * as React from "react";
import { AlertCircle, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

type Swatch = { name: string; className: string; hex: string; textOn?: string };

const SWATCHES: Swatch[] = [
  { name: "cream-50", className: "bg-cream-50", hex: "#FFF6EE", textOn: "text-ink-900" },
  { name: "cream-100", className: "bg-cream-100", hex: "#FBEEDF", textOn: "text-ink-900" },
  { name: "coral-50", className: "bg-coral-50", hex: "#FFEDE2", textOn: "text-ink-900" },
  { name: "coral-500", className: "bg-coral-500", hex: "#FF8A5C", textOn: "text-white" },
  { name: "coral-600", className: "bg-coral-600", hex: "#F26B3A", textOn: "text-white" },
  { name: "mint-50", className: "bg-mint-50", hex: "#E3F5F0", textOn: "text-ink-900" },
  { name: "mint-500", className: "bg-mint-500", hex: "#4FB7A1", textOn: "text-white" },
  { name: "mint-600", className: "bg-mint-600", hex: "#3A9684", textOn: "text-white" },
  { name: "ink-200", className: "bg-ink-200", hex: "#E5DED6", textOn: "text-ink-900" },
  { name: "ink-500", className: "bg-ink-500", hex: "#7A6F66", textOn: "text-white" },
  { name: "ink-700", className: "bg-ink-700", hex: "#4A413B", textOn: "text-white" },
  { name: "ink-900", className: "bg-ink-900", hex: "#1F1A17", textOn: "text-white" },
  { name: "danger", className: "bg-danger", hex: "#D9534F", textOn: "text-white" },
  { name: "warning", className: "bg-warning", hex: "#E8A33D", textOn: "text-white" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink-200/60 py-10 first:border-t-0">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-ink-900 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

function Badge({
  variant = "default",
  children,
}: {
  variant?: "default" | "coral" | "mint" | "warning" | "danger" | "outline";
  children: React.ReactNode;
}) {
  const variants: Record<string, string> = {
    default: "bg-ink-200 text-ink-900",
    coral: "bg-coral-50 text-coral-600",
    mint: "bg-mint-50 text-mint-600",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    outline: "border border-ink-200 text-ink-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant],
      )}
    >
      {children}
    </span>
  );
}

export default function StyleguidePage() {
  const [text, setText] = React.useState("");

  return (
    <main className="container py-12">
      <header className="mb-10">
        <h1 className="font-display text-display-mobile text-ink-900 sm:text-display-tablet">
          Ecokids Styleguide
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-500">
          Trang này chỉ dùng để QA visual — không hiển thị trên production. Mọi token màu, kiểu chữ
          và component nguyên thủy sẽ được hiển thị tại đây để dễ kiểm tra.
        </p>
      </header>

      <Section
        title="Màu sắc"
        description="Bảng màu thương hiệu — cream, coral, mint, ink, cùng các màu trạng thái."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map((s) => (
            <div
              key={s.name}
              className="overflow-hidden rounded-xl border border-ink-200/60 bg-white shadow-sm"
            >
              <div className={cn("flex h-20 items-end p-3", s.className, s.textOn)}>
                <span className="text-xs font-medium">{s.name}</span>
              </div>
              <div className="px-3 py-2 text-xs text-ink-500">{s.hex}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography" description="Be Vietnam Pro, các cấp tiêu đề và body.">
        <div className="space-y-4">
          <div className="font-display text-display-mobile text-ink-900 sm:text-display-tablet lg:text-display-desktop">
            Display — Thời trang trẻ em
          </div>
          <h1 className="text-3xl font-bold text-ink-900">Heading 1 — Bộ sưu tập mùa hè</h1>
          <h2 className="text-2xl font-semibold text-ink-900">Heading 2 — Áo thun cho bé</h2>
          <h3 className="text-xl font-semibold text-ink-900">Heading 3 — Sản phẩm nổi bật</h3>
          <h4 className="text-lg font-medium text-ink-900">Heading 4 — Chi tiết</h4>
          <p className="text-base text-ink-700">
            Body — Ecokids mang đến những bộ trang phục an toàn, thoải mái và đáng yêu cho bé từ sơ
            sinh đến 12 tuổi.
          </p>
          <p className="text-sm text-ink-500">
            Small — Chất liệu cotton 100% mềm mại, thấm hút mồ hôi tốt.
          </p>
          <p className="text-xs uppercase tracking-wider text-ink-500">Caption — Hướng dẫn giặt</p>
        </div>
      </Section>

      <Section title="Buttons" description="Các biến thể và kích thước, kèm trạng thái loading.">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>Đang lưu...</Button>
            <Button variant="secondary" loading>
              Đang tải
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      <Section title="Inputs" description="Default, error, kèm label / hint / lỗi.">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sg-input-default">Họ và tên</Label>
            <Input id="sg-input-default" placeholder="Nhập họ và tên" />
            <p className="text-xs text-ink-500">Vui lòng nhập đầy đủ họ và tên.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sg-input-error">Email</Label>
            <Input
              id="sg-input-error"
              type="email"
              defaultValue="khong-hop-le"
              error
              aria-describedby="sg-input-error-msg"
            />
            <p id="sg-input-error-msg" className="text-xs text-danger">
              Email không hợp lệ.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sg-input-disabled">Số điện thoại</Label>
            <Input id="sg-input-disabled" placeholder="0123 456 789" disabled />
          </div>
        </div>
      </Section>

      <Section title="Textarea" description="Vùng nhập nhiều dòng.">
        <div className="max-w-xl space-y-1.5">
          <Label htmlFor="sg-textarea">Lời nhắn</Label>
          <Textarea
            id="sg-textarea"
            placeholder="Nhập lời nhắn của bạn..."
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-xs text-ink-500">{text.length} ký tự</p>
        </div>
      </Section>

      <Section title="Badges" description="Nhãn nhỏ thể hiện trạng thái hoặc phân loại.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Mặc định</Badge>
          <Badge variant="coral">Mới</Badge>
          <Badge variant="mint">Sẵn hàng</Badge>
          <Badge variant="warning">Sắp hết</Badge>
          <Badge variant="danger">Hết hàng</Badge>
          <Badge variant="outline">Ưu đãi</Badge>
        </div>
      </Section>

      <Section title="Cards" description="Khối nội dung — mặc định và tương tác.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink-200/60 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink-900">Áo thun cotton hữu cơ</h3>
            <p className="mt-1 text-sm text-ink-500">An toàn cho làn da bé.</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-coral-600">199.000đ</span>
              <Button size="sm">Thêm vào giỏ</Button>
            </div>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-ink-200/60 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500 focus-visible:ring-offset-2"
          >
            <h3 className="text-base font-semibold text-ink-900">Quần đùi mùa hè</h3>
            <p className="mt-1 text-sm text-ink-500">Card tương tác — hover/focus.</p>
          </button>
        </div>
      </Section>

      <Section title="Skeleton" description="Trạng thái chờ tải nội dung.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="h-4 w-1/3 animate-pulse rounded-md bg-ink-200/70" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-ink-200/70" />
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-ink-200/70" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-ink-200/70" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded-md bg-ink-200/70" />
              <div className="h-3 w-2/3 animate-pulse rounded-md bg-ink-200/70" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Spinner" description="Trạng thái loading inline.">
        <div className="flex items-center gap-6">
          <div
            role="status"
            aria-label="Đang tải"
            className="h-5 w-5 animate-spin rounded-full border-2 border-ink-200 border-t-coral-500"
          />
          <div
            role="status"
            aria-label="Đang tải"
            className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-coral-500"
          />
          <div
            role="status"
            aria-label="Đang tải"
            className="h-12 w-12 animate-spin rounded-full border-4 border-ink-200 border-t-coral-500"
          />
        </div>
      </Section>

      <Section title="Avatar" description="Ảnh đại diện — với ảnh hoặc chữ viết tắt.">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-cream-100 text-ink-700">
            <User className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-coral-500 text-sm font-semibold text-white">
            EK
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint-500 text-sm font-semibold text-white">
            AN
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-700 text-base font-semibold text-white">
            NM
          </div>
        </div>
      </Section>

      <Section
        title="Còn thiếu — sẽ bổ sung ở sprint sau"
        description="Các primitive chưa được tạo (Dialog, Dropdown, Tabs, Select, Checkbox, Radio, EmptyState, Pagination) sẽ thêm vào styleguide khi có."
      >
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-ink-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <p>
            Hiện tại <code className="rounded bg-cream-100 px-1 py-0.5 text-xs">src/components/ui</code>{" "}
            mới có <strong>Button, Input, Label, Textarea</strong>. Các primitive khác sẽ được thêm
            và hiển thị lại trong trang này.
          </p>
        </div>
      </Section>
    </main>
  );
}

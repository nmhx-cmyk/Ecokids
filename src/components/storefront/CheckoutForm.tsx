"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentMethod } from "@prisma/client";
import {
  Banknote,
  CreditCard,
  MapPin,
  ShoppingBag,
  Ticket,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  RadioGroup,
  RadioGroupItem,
  Skeleton,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
} from "@/lib/constants/shipping";
import { placeOrder } from "@/lib/server/orders";
import { previewVoucher } from "@/lib/server/vouchers";
import { cn } from "@/lib/utils/cn";
import { formatPhoneVn, formatVnd } from "@/lib/utils/format";
import {
  placeOrderSchema,
  type PlaceOrderInput,
} from "@/lib/validations/order";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  selectSubtotal,
  useCartStore,
  type CartItem,
} from "@/stores/cart-store";
import type { UserAddress } from "@/lib/queries/addresses";

import { AddressSelector } from "./AddressSelector";
import {
  VnDivisionsSelect,
  type VnDivisionsValue,
} from "./VnDivisionsSelect";

interface CheckoutFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
  savedAddresses: UserAddress[];
}

const EMPTY_DIVISIONS: VnDivisionsValue = {
  provinceCode: "",
  province: "",
  districtCode: "",
  district: "",
  wardCode: "",
  ward: "",
};

export function CheckoutForm({ user, savedAddresses }: CheckoutFormProps) {
  const hydrated = useHydrated();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const [isPending, startTransition] = useTransition();
  const [highlightVariantId, setHighlightVariantId] = useState<string | null>(
    null,
  );
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherPending, setVoucherPending] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
  } | null>(null);

  const defaultAddress = useMemo(
    () => savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null,
    [savedAddresses],
  );

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    defaultAddress?.id ?? null,
  );
  const [divisions, setDivisions] =
    useState<VnDivisionsValue>(EMPTY_DIVISIONS);

  const initialItems = useMemo(
    () => items.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlaceOrderInput>({
    resolver: zodResolver(placeOrderSchema),
    defaultValues: {
      items: initialItems,
      shippingAddress: {
        recipientName: defaultAddress?.recipientName ?? user.name ?? "",
        phone: defaultAddress?.phone
          ? formatPhoneVn(defaultAddress.phone)
          : user.phone
            ? formatPhoneVn(user.phone)
            : "",
        province: defaultAddress?.province ?? "",
        provinceCode: defaultAddress?.provinceCode ?? "",
        district: defaultAddress?.district ?? "",
        districtCode: defaultAddress?.districtCode ?? "",
        ward: defaultAddress?.ward ?? "",
        wardCode: defaultAddress?.wardCode ?? "",
        addressLine: defaultAddress?.addressLine ?? "",
      },
      paymentMethod: PaymentMethod.COD,
      note: "",
      saveAddress: false,
    },
  });

  const paymentMethod = watch("paymentMethod");

  // Sync selected saved address into form
  useEffect(() => {
    if (selectedAddressId) {
      const addr = savedAddresses.find((a) => a.id === selectedAddressId);
      if (!addr) return;
      setValue("shippingAddress.recipientName", addr.recipientName);
      setValue("shippingAddress.phone", formatPhoneVn(addr.phone));
      setValue("shippingAddress.province", addr.province);
      setValue("shippingAddress.provinceCode", addr.provinceCode);
      setValue("shippingAddress.district", addr.district);
      setValue("shippingAddress.districtCode", addr.districtCode);
      setValue("shippingAddress.ward", addr.ward);
      setValue("shippingAddress.wardCode", addr.wardCode);
      setValue("shippingAddress.addressLine", addr.addressLine);
      setValue("saveAddress", false);
    } else {
      // New address mode — clear division fields & address line
      setDivisions(EMPTY_DIVISIONS);
      setValue("shippingAddress.province", "");
      setValue("shippingAddress.provinceCode", "");
      setValue("shippingAddress.district", "");
      setValue("shippingAddress.districtCode", "");
      setValue("shippingAddress.ward", "");
      setValue("shippingAddress.wardCode", "");
      setValue("shippingAddress.addressLine", "");
    }
  }, [selectedAddressId, savedAddresses, setValue]);

  function handleDivisionsChange(next: VnDivisionsValue) {
    setDivisions(next);
    setValue("shippingAddress.province", next.province);
    setValue("shippingAddress.provinceCode", next.provinceCode);
    setValue("shippingAddress.district", next.district);
    setValue("shippingAddress.districtCode", next.districtCode);
    setValue("shippingAddress.ward", next.ward);
    setValue("shippingAddress.wardCode", next.wardCode);
  }

  // Redirect to cart if hydrated and empty
  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      const timer = setTimeout(() => router.push("/cart"), 2000);
      return () => clearTimeout(timer);
    }
  }, [hydrated, items.length, router]);

  // Keep form's `items` field in sync with cart store so Zod min(1) validation passes
  useEffect(() => {
    setValue(
      "items",
      items.map((it) => ({ variantId: it.variantId, quantity: it.quantity })),
      { shouldValidate: false },
    );
  }, [items, setValue]);

  if (!hydrated) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" strokeWidth={1.5} />}
            title="Giỏ hàng trống"
            description="Bạn sẽ được chuyển về trang giỏ hàng trong giây lát."
            action={
              <Button asChild>
                <Link href="/products">Tiếp tục mua sắm</Link>
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  const subtotal = selectSubtotal({ items } as never);
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = isFreeShipping ? 0 : SHIPPING_FEE;
  const discount = appliedVoucher?.discount ?? 0;
  const total = Math.max(0, subtotal + shippingFee - discount);

  async function handleApplyVoucher() {
    const code = voucherInput.trim();
    if (!code) return;
    setVoucherPending(true);
    const result = await previewVoucher({ code, subtotal });
    setVoucherPending(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    setAppliedVoucher({ code: result.data.code, discount: result.data.discount });
    toast.success(`Đã áp dụng mã ${result.data.code}`);
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherInput("");
  }

  function onSubmit(data: PlaceOrderInput) {
    const cartItems = items.map((it) => ({
      variantId: it.variantId,
      quantity: it.quantity,
    }));
    if (cartItems.length === 0) {
      toast.error("Giỏ hàng đang trống");
      return;
    }
    const payload: PlaceOrderInput = {
      ...data,
      items: cartItems,
      saveAddress: selectedAddressId === null ? data.saveAddress : false,
      voucherCode: appliedVoucher?.code,
    };

    startTransition(async () => {
      const result = await placeOrder(payload);
      if (result.ok) {
        clearCart();
        if (result.data.checkoutUrl) {
          // PayOS: hand off to the hosted VietQR checkout page.
          window.location.href = result.data.checkoutUrl;
          return;
        }
        toast.success("Đặt hàng thành công!");
        router.push(`/order-confirmation/${result.data.orderCode}`);
      } else {
        toast.error(result.error.message);
        if (result.error.field) {
          setHighlightVariantId(result.error.field);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    });
  }

  function onInvalid(errs: typeof errors) {
    // Surface the first validation error to the user instead of silently blocking.
    const first =
      errs.shippingAddress?.recipientName?.message ??
      errs.shippingAddress?.phone?.message ??
      errs.shippingAddress?.province?.message ??
      errs.shippingAddress?.district?.message ??
      errs.shippingAddress?.ward?.message ??
      errs.shippingAddress?.addressLine?.message ??
      errs.items?.message ??
      errs.paymentMethod?.message ??
      "Vui lòng kiểm tra lại các trường thông tin";
    toast.error(first);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const shippingAddressErrors = errors.shippingAddress;
  const isNewAddress = selectedAddressId === null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="grid gap-6 lg:grid-cols-3"
      noValidate
    >
      <div className="space-y-6 lg:col-span-2">
        {/* Section 1 — Recipient */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Người nhận</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Họ và tên"
              htmlFor="recipientName"
              required
              error={shippingAddressErrors?.recipientName?.message}
            >
              <Input
                id="recipientName"
                placeholder="Nguyễn Văn A"
                {...register("shippingAddress.recipientName")}
                error={Boolean(shippingAddressErrors?.recipientName)}
              />
            </FormField>
            <FormField
              label="Số điện thoại"
              htmlFor="phone"
              required
              error={shippingAddressErrors?.phone?.message}
              hint="Ví dụ: 0901234567"
            >
              <Input
                id="phone"
                inputMode="tel"
                placeholder="0901234567"
                {...register("shippingAddress.phone")}
                error={Boolean(shippingAddressErrors?.phone)}
              />
            </FormField>
            <FormField label="Email" htmlFor="email" className="sm:col-span-2">
              <Input
                id="email"
                type="email"
                value={user.email}
                readOnly
                className="bg-cream-50"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Section 2 — Shipping address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Địa chỉ giao hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedAddresses.length > 0 ? (
              <AddressSelector
                savedAddresses={savedAddresses}
                selectedAddressId={selectedAddressId}
                onSelect={setSelectedAddressId}
              />
            ) : null}

            {isNewAddress ? (
              <div className="space-y-4 rounded-xl border border-ink-200 bg-cream-50/50 p-4">
                <VnDivisionsSelect
                  value={divisions}
                  onChange={handleDivisionsChange}
                  errors={{
                    province: shippingAddressErrors?.province?.message,
                    district: shippingAddressErrors?.district?.message,
                    ward: shippingAddressErrors?.ward?.message,
                  }}
                />
                <FormField
                  label="Số nhà, tên đường"
                  htmlFor="addressLine"
                  required
                  error={shippingAddressErrors?.addressLine?.message}
                >
                  <Input
                    id="addressLine"
                    placeholder="123 Lê Lợi"
                    {...register("shippingAddress.addressLine")}
                    error={Boolean(shippingAddressErrors?.addressLine)}
                  />
                </FormField>
                <Controller
                  control={control}
                  name="saveAddress"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                      Lưu địa chỉ này cho lần sau
                    </label>
                  )}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Section 3 — Shipping method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Vận chuyển
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border border-coral-500 bg-white p-4 ring-1 ring-coral-500">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-coral-500"
                >
                  <span className="h-2 w-2 rounded-full bg-coral-500" />
                </span>
                <div>
                  <p className="font-medium text-ink-900">
                    Giao hàng tiêu chuẩn
                  </p>
                  <p className="text-xs text-ink-500">2 - 5 ngày làm việc</p>
                </div>
              </div>
              <div className="text-right">
                {isFreeShipping ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-500 line-through">
                      {formatVnd(SHIPPING_FEE)}
                    </span>
                    <Badge variant="mint">Miễn phí</Badge>
                  </div>
                ) : (
                  <span className="font-semibold text-ink-900">
                    {formatVnd(SHIPPING_FEE)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4 — Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Phương thức thanh toán
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(v) =>
                    field.onChange(v as "COD" | "PAYOS")
                  }
                  className="gap-3"
                >
                  <PaymentOption
                    value={PaymentMethod.COD}
                    selected={field.value === PaymentMethod.COD}
                    icon={
                      <Banknote className="h-5 w-5" strokeWidth={1.75} />
                    }
                    title="Thanh toán khi nhận hàng (COD)"
                    description="Trả tiền mặt cho shipper khi nhận hàng"
                  />
                  <PaymentOption
                    value={PaymentMethod.PAYOS}
                    selected={field.value === PaymentMethod.PAYOS}
                    icon={
                      <CreditCard className="h-5 w-5" strokeWidth={1.75} />
                    }
                    title="Thanh toán online (PayOS)"
                    description="Quét VietQR hoặc chuyển khoản, xác nhận tự động"
                  />
                </RadioGroup>
              )}
            />
            {paymentMethod === PaymentMethod.PAYOS ? (
              <div className="rounded-xl border border-mint-500/30 bg-mint-50/60 p-3 text-sm text-ink-700">
                Sau khi đặt hàng, bạn sẽ được chuyển tới trang thanh toán PayOS
                để quét mã VietQR. Đơn hàng tự xác nhận ngay khi nhận được tiền.
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Section 5 — Note */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="note"
              rows={3}
              placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
              {...register("note")}
            />
          </CardContent>
        </Card>
      </div>

      {/* Summary sidebar */}
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Đơn hàng ({items.length} sản phẩm)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="divide-y divide-ink-200">
                {items.map((item) => (
                  <CheckoutItemRow
                    key={item.variantId}
                    item={item}
                    highlighted={highlightVariantId === item.variantId}
                  />
                ))}
              </ul>

              {/* Voucher */}
              <div className="border-t border-ink-200 pt-4">
                {appliedVoucher ? (
                  <div className="flex items-center justify-between rounded-lg bg-mint-50 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 font-medium text-mint-600">
                      <Ticket className="h-4 w-4" aria-hidden="true" />
                      {appliedVoucher.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-danger"
                    >
                      <X className="h-3 w-3" aria-hidden="true" /> Bỏ
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                      placeholder="Mã giảm giá"
                      className="uppercase"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleApplyVoucher();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleApplyVoucher}
                      loading={voucherPending}
                    >
                      Áp dụng
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-ink-200 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-700">Tạm tính</span>
                  <span className="font-medium text-ink-900">
                    {formatVnd(subtotal)}
                  </span>
                </div>
                {discount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-ink-700">Giảm giá</span>
                    <span className="font-medium text-mint-600">
                      −{formatVnd(discount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-ink-700">Phí vận chuyển</span>
                  <span className="font-medium text-ink-900">
                    {isFreeShipping ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-ink-500 line-through">
                          {formatVnd(SHIPPING_FEE)}
                        </span>
                        <span className="text-mint-600">Miễn phí</span>
                      </span>
                    ) : (
                      formatVnd(shippingFee)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-ink-200 pt-3">
                  <span className="text-ink-900">Tổng cộng</span>
                  <span className="text-lg font-bold text-coral-600">
                    {formatVnd(total)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" /> Đang xử lý...
                  </>
                ) : (
                  "Đặt hàng"
                )}
              </Button>

              <p className="text-center text-xs text-ink-500">
                Bằng việc đặt hàng, bạn đồng ý với{" "}
                <Link href="/policies/terms" className="underline">
                  điều khoản
                </Link>{" "}
                của Ecokids.
              </p>
            </CardContent>
          </Card>
        </div>
      </aside>
    </form>
  );
}

interface CheckoutItemRowProps {
  item: CartItem;
  highlighted: boolean;
}

function CheckoutItemRow({ item, highlighted }: CheckoutItemRowProps) {
  return (
    <li
      className={cn(
        "flex gap-3 py-3 transition-colors",
        highlighted && "rounded-lg bg-coral-50 px-2 ring-1 ring-coral-500",
      )}
    >
      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-100">
        {item.productImage ? (
          <Image
            src={item.productImage}
            alt={item.productName}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink-900 px-1 text-[10px] font-semibold text-white"
        >
          {item.quantity}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-ink-900">
          {item.productName}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          {item.size} · {item.color}
        </p>
      </div>
      <div className="shrink-0 text-right text-sm font-semibold text-ink-900">
        {formatVnd(item.unitPrice * item.quantity)}
      </div>
    </li>
  );
}

interface PaymentOptionProps {
  value: PaymentMethod;
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function PaymentOption({
  value,
  selected,
  icon,
  title,
  description,
}: PaymentOptionProps) {
  const id = `pm-${value}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-colors",
        selected
          ? "border-coral-500 ring-1 ring-coral-500"
          : "hover:border-ink-500/40",
      )}
    >
      <RadioGroupItem id={id} value={value} />
      <span className="text-ink-700">{icon}</span>
      <div className="flex-1">
        <p className="font-medium text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{description}</p>
      </div>
    </label>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

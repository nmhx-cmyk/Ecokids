import type { Metadata } from "next";

import { CheckoutForm } from "@/components/storefront/CheckoutForm";
import { getUserAddresses } from "@/lib/queries/addresses";
import { requireUser } from "@/lib/server/user-actions";

export const metadata: Metadata = {
  title: "Thanh toán",
};

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const savedAddresses = await getUserAddresses(user.id);

  return (
    <div className="container py-6 lg:py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink-900 lg:text-3xl">
        Thanh toán
      </h1>
      <CheckoutForm
        user={{
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
        }}
        savedAddresses={savedAddresses}
      />
    </div>
  );
}

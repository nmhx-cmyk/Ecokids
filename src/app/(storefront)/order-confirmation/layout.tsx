import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xác nhận đơn hàng",
  robots: { index: false, follow: false },
};

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

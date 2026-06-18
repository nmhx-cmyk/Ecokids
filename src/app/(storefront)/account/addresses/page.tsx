import { AddressList } from "@/components/account/AddressList";
import { getUserAddresses } from "@/lib/queries/addresses";
import { requireUser } from "@/lib/server/user-actions";

export const metadata = {
  title: "Địa chỉ giao hàng",
};

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await getUserAddresses(user.id);

  return <AddressList initialAddresses={addresses} />;
}

import { ChangePasswordSection } from "@/components/account/ChangePasswordSection";
import { ProfileForm } from "@/components/account/ProfileForm";
import { requireUser } from "@/lib/server/user-actions";

export const metadata = {
  title: "Thông tin tài khoản",
};

export default async function AccountPage() {
  const user = await requireUser("/account");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <ProfileForm
        initial={{
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        }}
      />
      <ChangePasswordSection />
    </div>
  );
}

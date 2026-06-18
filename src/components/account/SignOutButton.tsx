"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/server/auth-actions";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      loading={isPending}
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Đăng xuất
    </Button>
  );
}

"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PrintTriggerProps {
  className?: string;
}

export function PrintTrigger({ className }: PrintTriggerProps) {
  return (
    <Button
      type="button"
      variant="primary"
      className={className}
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      In / Lưu PDF
    </Button>
  );
}

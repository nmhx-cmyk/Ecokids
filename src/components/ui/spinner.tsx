import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin text-coral-500", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

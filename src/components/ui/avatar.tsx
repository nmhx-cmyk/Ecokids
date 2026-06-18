import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-100 font-medium text-ink-700",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt: string;
  fallback: string;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, src, alt, fallback, ...props }, ref) => {
    const [errored, setErrored] = React.useState(false);
    const showImage = !!src && !errored;

    return (
      <span
        ref={ref}
        className={cn(avatarVariants({ size }), className)}
        {...props}
      >
        {showImage ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes="48px"
            className="object-cover"
            onError={() => setErrored(true)}
          />
        ) : (
          <span aria-label={alt}>{fallback}</span>
        )}
      </span>
    );
  },
);
Avatar.displayName = "Avatar";

export { avatarVariants };

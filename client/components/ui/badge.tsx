import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[3px] border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none overflow-hidden transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/90",
        destructive:
          "border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30",
        outline:
          "border-border text-foreground bg-transparent hover:bg-accent",
        success:
          "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20",
        warning:
          "border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20",
        info:
          "border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

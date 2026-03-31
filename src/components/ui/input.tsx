import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg border border-[#2e2e2e] bg-[#1d1d1d] px-3 py-2 text-sm text-[#ede9e4] placeholder:text-[#6b5d4f] focus:border-[#b38f6f] focus:outline-none focus:ring-1 focus:ring-[#b38f6f]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };

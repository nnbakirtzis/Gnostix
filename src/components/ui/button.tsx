"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b38f6f]/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          {
            "bg-[#b38f6f] text-[#161616] hover:bg-[#c9a882]":
              variant === "default",
            "text-[#9e8f7f] hover:bg-[rgba(179,143,111,0.1)] hover:text-[#ede9e4]":
              variant === "ghost",
            "border border-[#2e2e2e] text-[#9e8f7f] hover:border-[#b38f6f] hover:text-[#b38f6f]":
              variant === "outline",
            "bg-red-900/40 text-red-400 hover:bg-red-900/70 hover:text-red-300":
              variant === "destructive",
          },
          {
            "h-8 px-3 text-xs": size === "sm",
            "h-9 px-4 text-sm": size === "md",
            "h-11 px-6 text-base": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

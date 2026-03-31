import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        !color && "bg-gray-800 text-slate-400",
        className
      )}
      style={
        color
          ? {
              backgroundColor: `${color}22`,
              color: color,
              border: `1px solid ${color}44`,
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

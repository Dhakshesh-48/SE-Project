import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-white",
        className,
      )}
    >
      <img
        src="/bearbots-logo.svg"
        alt=""
        className="size-full object-contain p-0.5"
      />
    </span>
  );
}

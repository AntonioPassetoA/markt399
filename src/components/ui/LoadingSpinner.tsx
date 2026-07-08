import { cn } from "@/lib/utils";

export function LoadingSpinner({
  className,
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-gray-500">
      <span
        className={cn(
          "h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand",
          className
        )}
      />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

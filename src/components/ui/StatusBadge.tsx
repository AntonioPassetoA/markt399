import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        color
      )}
    >
      {status}
    </span>
  );
}

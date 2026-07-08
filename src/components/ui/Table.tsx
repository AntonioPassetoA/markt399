import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ children, className }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-card">
      <table className={cn("w-full min-w-[640px] text-left text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
      {children}
    </thead>
  );
}

export function TBody({ children }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>;
}

export function TR({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("hover:bg-gray-50", className)} {...props}>
      {children}
    </tr>
  );
}

export function TH({ children, className }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function TD({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-gray-700", className)} {...props}>
      {children}
    </td>
  );
}

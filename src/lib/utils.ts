import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const sanitizedRows = rows.map(row =>
    row.map(cell => {
      const value = cell ?? "";
      const text = typeof value === "string" ? value : String(value);
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(",")
  );
  const csv = [headers.join(","), ...sanitizedRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

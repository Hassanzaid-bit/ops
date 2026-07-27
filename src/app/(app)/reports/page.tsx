import { Suspense } from "react";
import { ManagementReports } from "@/components/ManagementReports";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-[var(--ink-muted)]">
          Loading reports…
        </div>
      }
    >
      <ManagementReports />
    </Suspense>
  );
}

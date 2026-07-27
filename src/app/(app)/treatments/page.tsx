import { Suspense } from "react";
import { TreatmentReports } from "@/components/TreatmentReports";

export default function TreatmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-[var(--ink-muted)]">
          Loading treatments…
        </div>
      }
    >
      <TreatmentReports />
    </Suspense>
  );
}

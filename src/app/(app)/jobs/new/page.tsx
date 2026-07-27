import { Suspense } from "react";
import { JobForm } from "@/components/JobForm";

export default function NewJobPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-8 text-[var(--ink-muted)]">
          Loading…
        </div>
      }
    >
      <JobForm />
    </Suspense>
  );
}

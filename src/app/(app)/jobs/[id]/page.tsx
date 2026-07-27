import { Suspense } from "react";
import { JobForm } from "@/components/JobForm";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-8 text-[var(--ink-muted)]">
          Loading…
        </div>
      }
    >
      <JobForm visitId={id} />
    </Suspense>
  );
}

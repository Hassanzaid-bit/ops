import { Suspense } from "react";
import { FollowUpReports } from "@/components/FollowUpReports";

export default function FollowUpsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-[var(--ink-muted)]">
          Loading follow-ups…
        </div>
      }
    >
      <FollowUpReports />
    </Suspense>
  );
}

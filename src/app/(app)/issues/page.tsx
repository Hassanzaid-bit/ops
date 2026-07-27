import { Suspense } from "react";
import { IssueReports } from "@/components/IssueReports";

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-[var(--ink-muted)]">
          Loading issues…
        </div>
      }
    >
      <IssueReports />
    </Suspense>
  );
}

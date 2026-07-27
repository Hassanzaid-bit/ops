"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { CaptureFlow } from "@/components/CaptureFlow";
import { getVisit } from "@/lib/ops-store";
import type { ScheduledVisit } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export default function VisitPage({ params }: Props) {
  const { id } = use(params);
  const [visit, setVisit] = useState<ScheduledVisit | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setVisit(getVisit(id) ?? null);
  }, [id]);

  if (visit === undefined) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-[var(--ink-muted)]">
        Loading visit…
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-10">
        <p className="text-[var(--ink)]">Job not found.</p>
        <Link href="/jobs" className="text-[var(--accent-deep)]">
          Manage jobs →
        </Link>
      </div>
    );
  }

  return <CaptureFlow visit={visit} />;
}

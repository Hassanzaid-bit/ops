import { Suspense } from "react";
import { ClientsHub } from "@/components/ClientsHub";

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-[var(--ink-muted)]">
          Loading clients…
        </div>
      }
    >
      <ClientsHub />
    </Suspense>
  );
}

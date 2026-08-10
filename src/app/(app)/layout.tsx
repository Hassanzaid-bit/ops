import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  OfflineStatusBar,
  OfflineSyncProvider,
} from "@/components/OfflineSyncProvider";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  return (
    <>
      <OfflineSyncProvider />
      <AppShell user={user} statusBar={<OfflineStatusBar />}>
        {children}
      </AppShell>
      <PwaInstallPrompt />
    </>
  );
}

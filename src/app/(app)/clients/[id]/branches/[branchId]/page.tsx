import { BranchDetail } from "@/components/BranchDetail";

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ id: string; branchId: string }>;
}) {
  const { id, branchId } = await params;
  return <BranchDetail clientId={id} branchId={branchId} />;
}

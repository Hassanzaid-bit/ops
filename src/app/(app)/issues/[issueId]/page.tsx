"use client";

import { use } from "react";
import { IssueDetail } from "@/components/IssueDetail";

type Props = {
  params: Promise<{ issueId: string }>;
};

export default function IssueDetailPage({ params }: Props) {
  const { issueId } = use(params);
  return <IssueDetail issueId={issueId} />;
}

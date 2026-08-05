import { notFound, redirect } from "next/navigation";
import DataReviewForm from "./DataReviewForm";
import { getDataReviewData } from "@/lib/server/data-review";
import { isFeatureEnabled } from "@/lib/server/feature-flags";
import { hasOwnerSession } from "@/lib/server/owner-auth";

export const dynamic = "force-dynamic";

export default async function DataReviewPage() {
  if (!isFeatureEnabled("office")) notFound();
  if (!(await hasOwnerSession())) redirect("/login");

  return <DataReviewForm initialReview={await getDataReviewData()} />;
}

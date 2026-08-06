import { redirect } from "next/navigation";
import DataReviewForm from "@/app/office/data-review/DataReviewForm";
import { getDataReviewData } from "@/lib/server/data-review";
import { hasOwnerSession } from "@/lib/server/owner-auth";

export const dynamic = "force-dynamic";

export default async function AdminDataReviewPage() {
  if (!(await hasOwnerSession())) redirect("/login");

  return <DataReviewForm initialReview={await getDataReviewData()} />;
}

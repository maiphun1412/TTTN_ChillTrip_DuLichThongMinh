import AdminShell from "@/components/admin/AdminShell";
import AdminPromotionDetail from "@/components/admin/AdminPromotionDetail";

export default async function AdminPromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell>
      <AdminPromotionDetail promotionId={id} />
    </AdminShell>
  );
}
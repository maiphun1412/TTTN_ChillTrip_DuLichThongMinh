import AdminShell from "@/components/admin/AdminShell";
import AdminPromotionEdit from "@/components/admin/AdminPromotionEdit";

export default async function AdminPromotionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell>
      <AdminPromotionEdit promotionId={id} />
    </AdminShell>
  );
}
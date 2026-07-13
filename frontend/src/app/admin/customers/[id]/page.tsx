import AdminShell from "@/components/admin/AdminShell";
import AdminCustomerDetail from "@/components/admin/AdminCustomerDetail";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell>
      <AdminCustomerDetail customerId={id} />
    </AdminShell>
  );
}
import AdminShell from "@/components/admin/AdminShell";
import AdminCustomerEdit from "@/components/admin/AdminCustomerEdit";

export default async function AdminCustomerEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell>
      <AdminCustomerEdit customerId={id} />
    </AdminShell>
  );
}
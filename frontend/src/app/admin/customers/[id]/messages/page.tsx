import AdminShell from "@/components/admin/AdminShell";
import AdminCustomerMessages from "@/components/admin/AdminCustomerMessages";

export default async function AdminCustomerMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminShell>
      <AdminCustomerMessages customerId={id} />
    </AdminShell>
  );
}
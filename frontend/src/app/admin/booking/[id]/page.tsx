import AdminBookingDetail from "@/components/admin/AdminBookingDetail";
import AdminShell from "@/components/admin/AdminShell";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return 
  (
     <AdminShell>
      <AdminBookingDetail bookingId={id} />;
      </AdminShell>
  );
}
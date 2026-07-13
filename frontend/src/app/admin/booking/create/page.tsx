import AdminShell from "@/components/admin/AdminShell";
import AdminBookingCreate from "@/components/admin/AdminBookingCreate";

export default function Page() {
  return (
    <AdminShell>
      <AdminBookingCreate />
    </AdminShell>
  );
}
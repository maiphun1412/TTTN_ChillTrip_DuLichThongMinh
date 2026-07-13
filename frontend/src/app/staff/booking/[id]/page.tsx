import StaffShell from "@/components/staff/StaffShell";
import StaffBookingDetail from "@/components/staff/StaffBookingDetail";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StaffBookingDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <StaffShell>
      <StaffBookingDetail bookingId={id} />
    </StaffShell>
  );
}
import AdminShell from "@/components/admin/AdminShell";
import AdminArticleCreate from "@/components/admin/AdminArticleCreate";

export default function Page() {
  return (
    <AdminShell>
      <AdminArticleCreate />
    </AdminShell>
  );
}
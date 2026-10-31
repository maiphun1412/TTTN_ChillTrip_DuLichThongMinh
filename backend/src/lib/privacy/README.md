# Ghi nhật ký quyền riêng tư (Privacy Log)

Hai cuốn sổ, đều **chỉ ghi thêm** (trigger trong database chặn sửa/xóa):

| Bảng | Ghi gì | Hàm dùng |
|---|---|---|
| `privacy_access_logs` | Ai **xem** dữ liệu cá nhân của khách nào, được phép hay bị từ chối | `logPrivacyAccess()` |
| `audit_logs` | Ai **thay đổi** gì (tạo, sửa, xóa, đổi role, khóa, đăng nhập…) | `logAudit()` |

Admin xem cả hai ở trang **/admin/privacy-logs** (menu "Nhật ký hoạt động").

## Sau khi pull code về (làm 1 lần trên máy mỗi người)

1. Trong thư mục `backend`: `npx prisma db push` (tạo bảng `privacy_access_logs`).
2. Mở `backend/prisma/sql/privacy-logs.sql` bằng SSMS, chọn đúng database của bạn, bấm **Execute**
   (gắn khóa chống sửa/xóa log). Chạy lại nhiều lần vẫn an toàn.
3. Tắt backend, chạy `npx prisma generate`, rồi chạy lại backend.

## Cách gọi trong API của bạn

```ts
import { logPrivacyAccess, logAudit } from "@/lib/privacy/log";

// HDV xem khách: được phép
await logPrivacyAccess(req, {
  dataType: "CONTACT_INFO",        // hoặc PASSENGER_LIST, IDENTITY_DOC, HEALTH_NOTE...
  result: "ALLOWED",
  purpose: "TOUR_OPERATION",
  dataOwnerCustomerId: customerId,  // hoặc dataOwnerUserId
  departureId: tripId,
  bookingId,
});

// HDV xem khách: bị từ chối -> vẫn phải ghi, rồi mới trả 403
await logPrivacyAccess(req, {
  dataType: "CONTACT_INFO",
  result: "DENIED",
  reason: "GUIDE_NOT_ASSIGNED",     // TRIP_EXPIRED, CUSTOMER_NOT_IN_TRIP...
  dataOwnerCustomerId: customerId,
  departureId: tripId,
});

// HDV đổi trạng thái chuyến, gửi báo cáo, báo sự cố...
await logAudit(req, {
  module: "GUIDE_TRIP",
  action: "UPDATE_STATUS",          // CREATE_REPORT, CREATE_INCIDENT...
  entityName: "departure_schedules",
  entityId: tripId,
  oldData: { status: oldStatus },
  newData: { status: newStatus },
});
```

Lưu ý:
- **Không truyền** "ai đang thao tác": hàm tự lấy từ token + database.
- Có thể truyền nguyên object: hàm tự **bỏ mật khẩu/token** và **che CCCD, hộ chiếu, SĐT, email** trước khi ghi.
- Ghi log lỗi chỉ in ra console, không làm hỏng API.

Muốn bọc cả một API cho gọn, xem `withPrivacyAccessLog()` và `withAuditLog()` trong `log.ts`
(ví dụ dùng ở `src/app/api/admin/customers/[id]/route.ts`).

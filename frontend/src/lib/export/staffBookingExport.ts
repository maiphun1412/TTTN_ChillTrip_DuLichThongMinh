import type { StaffBookingItem } from "@/lib/api/staff.api";

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0) + "đ";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "Chờ xác nhận";
    case "CONFIRMED":
      return "Đã xác nhận";
    case "PAID":
      return "Đã thanh toán";
    case "PARTIALLY_PAID":
      return "Thanh toán một phần";
    case "DEPOSITED":
      return "Đặt cọc";
    case "CANCELLED":
      return "Đã hủy";
    case "COMPLETED":
      return "Hoàn thành";
    default:
      return status || "Chưa rõ";
  }
}

function getReportDate() {
  return new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* =========================
   XUẤT EXCEL
========================= */

export async function exportStaffBookingsToExcel(bookings: StaffBookingItem[], timeLabel?: string, fileSuffix?: string) {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bao cao dat cho");

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  worksheet.mergeCells("A1:L1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = `BÁO CÁO DANH SÁCH ĐẶT CHỖ ${timeLabel ? timeLabel.toUpperCase() : ""}`;
  titleCell.font = {
    name: "Times New Roman",
    size: 16,
    bold: true,
  };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.mergeCells("A2:L2");
  const dateCell = worksheet.getCell("A2");
  dateCell.value = `Ngày xuất báo cáo: ${getReportDate()}`;
  dateCell.font = {
    name: "Times New Roman",
    size: 12,
    italic: true,
  };
  dateCell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    "STT",
    "Mã đặt chỗ",
    "Khách hàng",
    "Email",
    "Số điện thoại",
    "Tour",
    "Ngày đi",
    "Ngày về",
    "Số khách",
    "Tổng thanh toán",
    "Đã thanh toán",
    "Trạng thái",
  ]);

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Times New Roman",
      size: 12,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00606C" },
    };
    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  bookings.forEach((booking, index) => {
    const row = worksheet.addRow([
      index + 1,
      booking.bookingCode,
      booking.customerName,
      booking.customerEmail || "Chưa có email",
      booking.customerPhone || "Chưa có SĐT",
      booking.tourName,
      booking.startDate || "Chưa có ngày",
      booking.endDate || "Chưa có ngày",
      booking.pax,
      booking.payableAmount,
      booking.paidAmount,
      getStatusLabel(booking.bookingStatus),
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: "Times New Roman",
        size: 12,
      };
      cell.alignment = {
        vertical: "middle",
        wrapText: true,
        horizontal:
          colNumber === 1 || colNumber === 9 || colNumber === 10 || colNumber === 11
            ? "center"
            : "left",
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    row.getCell(10).numFmt = '#,##0"đ"';
    row.getCell(11).numFmt = '#,##0"đ"';
  });

  worksheet.columns = [
    { width: 8 },
    { width: 18 },
    { width: 28 },
    { width: 30 },
    { width: 18 },
    { width: 36 },
    { width: 16 },
    { width: 16 },
    { width: 12 },
    { width: 20 },
    { width: 20 },
    { width: 24 },
  ];

  worksheet.eachRow((row) => {
    row.height = 24;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `bao-cao-dat-cho-${fileSuffix || Date.now()}.xlsx`);
}

/* =========================
   XUẤT PDF
   Dùng trình in của browser để giữ Times New Roman + tiếng Việt có dấu
========================= */

export function exportStaffBookingsToPdf(bookings: StaffBookingItem[], timeLabel?: string, fileSuffix?: string) {
  const rowsHtml = bookings
    .map(
      (booking, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${booking.bookingCode}</td>
          <td>${booking.customerName}</td>
          <td>${booking.customerPhone || "Chưa có SĐT"}</td>
          <td>${booking.tourName}</td>
          <td>${booking.startDate || "Chưa có ngày"}</td>
          <td>${booking.endDate || "Chưa có ngày"}</td>
          <td>${booking.pax}</td>
          <td>${formatMoney(booking.payableAmount)}</td>
          <td>${formatMoney(booking.paidAmount)}</td>
          <td>${getStatusLabel(booking.bookingStatus)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Báo cáo đặt chỗ ${timeLabel || ""}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 14mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family: "Times New Roman", Times, serif;
            color: #000;
            background: #fff;
            font-size: 13px;
          }

          .report-header {
            text-align: center;
            margin-bottom: 18px;
          }

          .report-header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: bold;
            text-transform: uppercase;
          }

          .report-header p {
            margin: 6px 0 0;
            font-size: 14px;
            font-style: italic;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            border: 1px solid #000;
            padding: 7px 8px;
            vertical-align: middle;
          }

          th {
            text-align: center;
            font-weight: bold;
            background: #eaeaea;
          }

          td:nth-child(1),
          td:nth-child(8),
          td:nth-child(9),
          td:nth-child(10) {
            text-align: center;
          }

          .footer {
            margin-top: 24px;
            display: flex;
            justify-content: flex-end;
          }

          .signature {
            text-align: center;
            width: 260px;
          }

          .signature p {
            margin: 4px 0;
          }

          .signature-space {
            height: 70px;
          }
        </style>
      </head>

      <body>
        <div class="report-header">
          <h1>Báo cáo danh sách đặt chỗ ${timeLabel || ""}</h1>
          <p>Ngày xuất báo cáo: ${getReportDate()}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>STT</th>
              <th>Mã đặt chỗ</th>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Tour</th>
              <th>Ngày đi</th>
              <th>Ngày về</th>
              <th>Số khách</th>
              <th>Tổng thanh toán</th>
              <th>Đã thanh toán</th>
              <th>Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            ${
              rowsHtml ||
              `<tr>
                <td colspan="11" style="text-align:center;">
                  Không có dữ liệu đặt chỗ.
                </td>
              </tr>`
            }
          </tbody>
        </table>

        <div class="footer">
          <div class="signature">
            <p>Người lập báo cáo</p>
            <p><i>Ký và ghi rõ họ tên</i></p>
            <div class="signature-space"></div>
          </div>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép popup để xuất PDF.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
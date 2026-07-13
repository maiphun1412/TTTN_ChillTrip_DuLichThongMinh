"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { GroupContractFormData } from "./GroupContractForm";

type Props = {
  data: GroupContractFormData;
};

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PREVIEW_SCALE = 0.72;

const PAGE_STYLE: CSSProperties = {
  width: `${PAGE_WIDTH}px`,
  height: `${PAGE_HEIGHT}px`,
  boxSizing: "border-box",
  padding: "56px 72px 72px",
  backgroundColor: "#ffffff",
  color: "#111111",
  fontFamily: '"Times New Roman", Times, serif',
  fontSize: "16px",
  lineHeight: "1.5",
  position: "relative",
  overflow: "hidden",
};

const SCREEN_PAGE_WRAP: CSSProperties = {
  width: `${PAGE_WIDTH * PREVIEW_SCALE}px`,
  height: `${PAGE_HEIGHT * PREVIEW_SCALE}px`,
  margin: "0 auto 28px",
  overflow: "hidden",
};

const SCREEN_PAGE_INNER: CSSProperties = {
  width: `${PAGE_WIDTH}px`,
  height: `${PAGE_HEIGHT}px`,
  transform: `scale(${PREVIEW_SCALE})`,
  transformOrigin: "top left",
};

export default function GroupContractPreview({ data }: Props) {
  const previewRef = useRef<HTMLDivElement | null>(null);

  async function exportPDF() {
    if (!previewRef.current) return;

    const pages = previewRef.current.querySelectorAll(".contract-page");
    if (!pages.length) return;

    const pdf = new jsPDF("p", "mm", "a4");

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      const oldTransform = page.style.transform;

      page.style.transform = "none";

      const canvas = await html2canvas(page, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      page.style.transform = oldTransform;

      const imgData = canvas.toDataURL("image/png");

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    }

    pdf.save(`${data.contractCode || "hop-dong-tour-doan"}.pdf`);
  }

  async function exportWord() {
    const doc = new Document({
      sections: [
        {
          children: [
            center("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", true),
            center("Độc lập – Tự do – Hạnh phúc", true),
            center("———————"),
            space(),
            center("HỢP ĐỒNG KINH TẾ", true, 32),
            center("(TỔ CHỨC CHƯƠNG TRÌNH THAM QUAN DU LỊCH)", true, 24),
            center(`Số: ${data.contractCode || "……/HĐDL"}`),
            space(),

            line("Căn cứ Luật Thương mại và Bộ luật Dân sự hiện hành;"),
            line("Căn cứ nhu cầu và khả năng cung cấp dịch vụ của hai bên;"),
            line(`Hôm nay, ngày ${data.createdDate || "……"}, chúng tôi gồm có:`),
            space(),

            title("BÊN A: KHÁCH HÀNG"),
            line(`Tên đơn vị: ${show(data.organizationName)}`),
            line(`Người đại diện: ${show(data.representativeName)}`),
            line(`Điện thoại: ${show(data.representativePhone)}`),
            line(`Email: ${show(data.representativeEmail)}`),
            space(),

            title("BÊN B: CÔNG TY CHILLTRIP"),
            line("Đơn vị: Công ty cung cấp dịch vụ du lịch ChillTrip"),
            line("Người đại diện: ………………………………"),
            line("Điện thoại: ………………………………"),
            line("Email: ………………………………"),
            space(),

            title("ĐIỀU 1: CHƯƠNG TRÌNH THAM QUAN DU LỊCH"),
            line(`Tên chương trình: ${show(data.tourName)}`),
            line(`Ngày khởi hành: ${show(data.startDate)}`),
            line(
              "Dịch vụ bao gồm phương tiện vận chuyển, lưu trú, ăn uống, vé tham quan, hướng dẫn viên, bảo hiểm du lịch và các dịch vụ khác theo chương trình."
            ),
            space(),

            title("ĐIỀU 2: SỐ LƯỢNG KHÁCH"),
            line(`Số lượng khách dự kiến: ${data.guestCount || "……"} người.`),
            space(),

            title("ĐIỀU 3: THỜI GIAN THỰC HIỆN"),
            line(`Thời gian khởi hành: ${show(data.startDate)}`),
            space(),

            title("ĐIỀU 4: GIÁ TRỊ HỢP ĐỒNG"),
            line(`Tổng giá trị hợp đồng: ${show(data.contractValue)}`),
            line(`Số tiền đặt cọc: ${show(data.depositAmount)}`),
            space(),

            title("ĐIỀU 5: THANH TOÁN"),
            line(
              data.paymentTerms ||
                "Bên A thanh toán tiền cọc sau khi ký hợp đồng. Phần còn lại thanh toán trước ngày khởi hành theo thỏa thuận."
            ),
            space(),

            title("ĐIỀU 6: ĐIỀU KIỆN PHẠT HỦY"),
            line(
              data.cancellationTerms ||
                "Việc hoãn hủy được thực hiện theo chính sách của ChillTrip và thời điểm hủy dịch vụ."
            ),
            space(),

            title("ĐIỀU 7: TRÁCH NHIỆM CỦA HAI BÊN"),
            line(
              "Bên A cung cấp thông tin đoàn khách chính xác, thanh toán đúng hạn và phối hợp với Bên B trong quá trình tổ chức tour."
            ),
            line(
              "Bên B tổ chức chương trình đúng nội dung đã thỏa thuận, đảm bảo chất lượng dịch vụ và hỗ trợ đoàn trong suốt hành trình."
            ),
            data.note ? line(data.note) : space(),
            space(),

            line(
              "Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản."
            ),
            space(),
            space(),
            center(
              "ĐẠI DIỆN BÊN A                                ĐẠI DIỆN BÊN B",
              true
            ),
            center(
              "Ký, ghi rõ họ tên                              Ký, ghi rõ họ tên"
            ),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${data.contractCode || "hop-dong-tour-doan"}.docx`);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={exportPDF}
          className="rounded-full bg-[#007B8A] px-5 py-3 text-sm font-bold text-white"
        >
          Xuất PDF
        </button>

        <button
          type="button"
          onClick={exportWord}
          className="rounded-full bg-[#9b4500] px-5 py-3 text-sm font-bold text-white"
        >
          Xuất Word
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <div ref={previewRef} className="min-w-0 pb-4">
          <div style={SCREEN_PAGE_WRAP}>
            <div
              className="contract-page shadow-lg"
              style={{ ...PAGE_STYLE, ...SCREEN_PAGE_INNER }}
            >
              <div className="grid grid-cols-2 gap-8 text-center text-[14px] leading-6">
                <div>
                  <p className="font-bold uppercase">CÔNG TY CHILLTRIP</p>
                  <p>———————</p>
                </div>

                <div>
                  <p className="font-bold uppercase">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-bold">Độc lập – Tự do – Hạnh phúc</p>
                  <p>———————</p>
                </div>
              </div>

              <div className="mt-10 text-center">
                <h1 className="text-[25px] font-black uppercase tracking-wide">
                  HỢP ĐỒNG KINH TẾ
                </h1>
                <p className="mt-2 text-[16px] font-bold uppercase">
                  Tổ chức chương trình tham quan du lịch
                </p>
                <p className="mt-3 font-semibold">
                  Số: {data.contractCode || "……/HĐDL"}
                </p>
              </div>

              <div className="mt-9 space-y-2 text-justify">
                <p>
                  - Căn cứ Luật Thương mại và Bộ luật Dân sự hiện hành của nước
                  Cộng hòa xã hội chủ nghĩa Việt Nam;
                </p>
                <p>- Căn cứ nhu cầu và khả năng cung cấp dịch vụ của hai bên;</p>
                <p>
                  Hôm nay, ngày {data.createdDate || "……"}, hai bên thống nhất
                  ký kết hợp đồng với nội dung như sau:
                </p>
              </div>

              <Section title="BÊN A: KHÁCH HÀNG">
                <Row label="Tên đơn vị" value={data.organizationName} />
                <Row label="Người đại diện" value={data.representativeName} />
                <Row label="Điện thoại" value={data.representativePhone} />
                <Row label="Email" value={data.representativeEmail} />
              </Section>

              <Section title="BÊN B: CÔNG TY CHILLTRIP">
                <Row
                  label="Đơn vị"
                  value="Công ty cung cấp dịch vụ du lịch ChillTrip"
                />
                <Row label="Người đại diện" value="………………………………" />
                <Row label="Điện thoại" value="………………………………" />
                <Row label="Email" value="………………………………" />
              </Section>

              <p className="mt-7 text-justify">
                Hai bên thống nhất ký một số điều khoản phục vụ khách du lịch
                như sau:
              </p>

              <Article title="ĐIỀU 1: CHƯƠNG TRÌNH THAM QUAN DU LỊCH">
                <p className="text-justify">
                  Bên B tổ chức cho Bên A chương trình:{" "}
                  <b>{data.tourName || "………………………………"}</b>.
                </p>
                <p>Ngày khởi hành: {data.startDate || "………………………………"}.</p>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>Phương tiện vận chuyển theo chương trình tour.</li>
                  <li>
                    Ăn uống, lưu trú, vé tham quan theo nội dung đã thỏa thuận.
                  </li>
                  <li>Hướng dẫn viên phục vụ đoàn trong suốt tuyến.</li>
                  <li>Bảo hiểm du lịch và các dịch vụ đi kèm theo quy định.</li>
                </ul>
              </Article>

              <Article title="ĐIỀU 2: SỐ LƯỢNG KHÁCH">
                <p>
                  Số lượng khách dự kiến:{" "}
                  <b>{data.guestCount || "……"} người</b>.
                </p>
                <p className="text-justify">
                  Trường hợp số lượng khách tăng hoặc giảm, hai bên sẽ thống
                  nhất lại chi phí phát sinh hoặc giảm trừ trước ngày khởi hành.
                </p>
              </Article>

              <Footer page="1 / 2" />
            </div>
          </div>

          <div style={SCREEN_PAGE_WRAP}>
            <div
              className="contract-page shadow-lg"
              style={{ ...PAGE_STYLE, ...SCREEN_PAGE_INNER }}
            >
              <Article title="ĐIỀU 3: THỜI GIAN THỰC HIỆN">
                <p>Thời gian khởi hành: {data.startDate || "………………………………"}.</p>
                <p className="text-justify">
                  Điểm đón, giờ đón và thông tin trưởng đoàn sẽ được xác nhận
                  trong phụ lục hoặc thông báo trước ngày khởi hành.
                </p>
              </Article>

              <Article title="ĐIỀU 4: GIÁ TRỊ HỢP ĐỒNG">
                <p>
                  Tổng giá trị hợp đồng:{" "}
                  <b>{data.contractValue || "………………………………"}</b>.
                </p>
                <p>
                  Số tiền đặt cọc:{" "}
                  <b>{data.depositAmount || "………………………………"}</b>.
                </p>
                <p className="text-justify">
                  Giá trị trên đã bao gồm các dịch vụ theo chương trình được hai
                  bên thống nhất.
                </p>
              </Article>

              <Article title="ĐIỀU 5: THANH TOÁN">
                <p className="whitespace-pre-line text-justify">
                  {data.paymentTerms ||
                    "Bên A thanh toán tiền cọc sau khi ký hợp đồng. Phần còn lại thanh toán trước ngày khởi hành theo thỏa thuận."}
                </p>
              </Article>

              <Article title="ĐIỀU 6: ĐIỀU KIỆN PHẠT HỦY">
                <p className="whitespace-pre-line text-justify">
                  {data.cancellationTerms ||
                    "Việc hoãn hủy được thực hiện theo chính sách của ChillTrip và thời điểm hủy dịch vụ."}
                </p>
              </Article>

              <Article title="ĐIỀU 7: TRÁCH NHIỆM CỦA HAI BÊN">
                <p className="text-justify">
                  Bên A có trách nhiệm cung cấp thông tin đoàn khách chính xác,
                  thanh toán đúng hạn và phối hợp với Bên B trong quá trình tổ
                  chức tour.
                </p>
                <p className="text-justify">
                  Bên B có trách nhiệm tổ chức chương trình đúng nội dung đã
                  thỏa thuận, đảm bảo chất lượng dịch vụ và hỗ trợ đoàn trong
                  suốt hành trình.
                </p>
                <p className="text-justify">
                  Mọi phát sinh trong quá trình thực hiện hợp đồng sẽ được hai
                  bên trao đổi và giải quyết trên tinh thần hợp tác, tôn trọng
                  quyền lợi hợp pháp của nhau.
                </p>
                {data.note ? (
                  <p className="whitespace-pre-line text-justify">{data.note}</p>
                ) : null}
              </Article>

              <p className="mt-8 text-justify">
                Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi
                bên giữ 01 bản.
              </p>

              <div className="mt-20 grid grid-cols-2 text-center font-bold">
                <div>
                  <p>ĐẠI DIỆN BÊN A</p>
                  <p className="mt-2 text-sm font-normal italic">
                    Ký, ghi rõ họ tên
                  </p>
                  <p className="mt-28 font-normal">
                    {data.representativeName || ""}
                  </p>
                </div>

                <div>
                  <p>ĐẠI DIỆN BÊN B</p>
                  <p className="mt-2 text-sm font-normal italic">
                    Ký, ghi rõ họ tên
                  </p>
                  <p className="mt-28 font-normal">CHILLTRIP</p>
                </div>
              </div>

              <Footer page="2 / 2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="font-black uppercase">{title}</h2>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  );
}

function Article({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 font-black uppercase">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <p>
      <b>{label}:</b> {value || "………………………………"}
    </p>
  );
}

function Footer({ page }: { page: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "72px",
        right: "72px",
        bottom: "28px",
        textAlign: "center",
        fontSize: "13px",
        color: "#333333",
        zIndex: 10,
        backgroundColor: "#ffffff",
      }}
    >
      {page}
    </div>
  );
}

function show(value?: string | number | null) {
  return value ? String(value) : "………………………………";
}

function center(text: string, bold = false, size = 24) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold, size })],
  });
}

function line(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: text || "" })],
  });
}

function title(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true })],
  });
}

function space() {
  return new Paragraph({
    children: [new TextRun({ text: "" })],
  });
}
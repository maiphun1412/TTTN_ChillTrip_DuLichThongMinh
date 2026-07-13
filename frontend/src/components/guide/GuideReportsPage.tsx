"use client";

import { useEffect, useMemo, useState } from "react";
import GuideShell from "@/components/guide/GuideShell";
import {
  getGuideMeApi,
  getGuideReportsApi,
  saveGuideEndTripReportApi,
  type EndTripReportData,
  type EndTripReportExpense,
  type GuideEndTripReport,
  type GuideMe,
} from "@/lib/api/guide.api";

type FilterKey = "ALL" | "MUST_REPORT" | "MISSING" | "DRAFT" | "SUBMITTED";
type ViewMode = "LIST" | "DETAIL" | "WRITE";

const emptyReport: EndTripReportData = {
  generalSummary: "",
  incidentSummary: "",
  positiveFeedback: [""],
  improvementFeedback: [""],
  expenses: [],
  images: [],
  overallRating: 5,
  recommendation: "",
  nextAction: "",
};

function formatDate(value?: string | null) {
  if (!value) return "Đang cập nhật";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Đang cập nhật";

  return date.toLocaleDateString("vi-VN");
}

function formatMoney(value?: number | string | null) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function statusText(status: GuideEndTripReport["reportStatus"]) {
  switch (status) {
    case "SUBMITTED":
      return "Đã gửi";
    case "DRAFT":
      return "Bản nháp";
    default:
      return "Chưa viết";
  }
}

function statusClass(status: GuideEndTripReport["reportStatus"]) {
  switch (status) {
    case "SUBMITTED":
      return "bg-[#ddf9ff] text-[#00606c]";
    case "DRAFT":
      return "bg-[#fff3e8] text-[#9b4500]";
    default:
      return "bg-[#ffdad6] text-[#93000a]";
  }
}

function normalizeReport(report?: EndTripReportData | null): EndTripReportData {
  return {
    ...emptyReport,
    ...(report || {}),
    positiveFeedback:
      report?.positiveFeedback && report.positiveFeedback.length > 0
        ? report.positiveFeedback
        : [""],
    improvementFeedback:
      report?.improvementFeedback && report.improvementFeedback.length > 0
        ? report.improvementFeedback
        : [""],
    expenses: report?.expenses || [],
    images: report?.images || [],
  };
}

export default function GuideReportsPage() {
  const [guide, setGuide] = useState<GuideMe | null>(null);
  const [reports, setReports] = useState<GuideEndTripReport[]>([]);
  const [selected, setSelected] = useState<GuideEndTripReport | null>(null);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [keyword, setKeyword] = useState("");
  const [mode, setMode] = useState<ViewMode>("LIST");
  const [form, setForm] = useState<EndTripReportData>(emptyReport);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    try {
      setLoading(true);

      const [guideData, reportData] = await Promise.all([
        getGuideMeApi(),
        getGuideReportsApi(),
      ]);

      setGuide(guideData);
      setReports(reportData);
    } catch (error) {
      console.error("Load guide reports error:", error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredReports = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return reports.filter((item) => {
      if (filter === "MUST_REPORT" && !item.mustReport) return false;
      if (filter === "MISSING" && item.reportStatus !== "MISSING") return false;
      if (filter === "DRAFT" && item.reportStatus !== "DRAFT") return false;
      if (filter === "SUBMITTED" && item.reportStatus !== "SUBMITTED") {
        return false;
      }

      if (!search) return true;

      const text = [
        item.tourName,
        item.tourCode,
        item.departureCode,
        item.destinationName,
        item.destinationCity,
        item.destinationCountry,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(search);
    });
  }, [reports, filter, keyword]);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      mustReport: reports.filter((item) => item.mustReport).length,
      submitted: reports.filter((item) => item.reportStatus === "SUBMITTED")
        .length,
      draft: reports.filter((item) => item.reportStatus === "DRAFT").length,
    };
  }, [reports]);

  function openWrite(item: GuideEndTripReport) {
    setSelected(item);
    setForm(normalizeReport(item.report));
    setMode("WRITE");
  }

  function openDetail(item: GuideEndTripReport) {
    setSelected(item);
    setMode("DETAIL");
  }

  async function handleSave(status: "DRAFT" | "SUBMITTED") {
    if (!selected) return;

    try {
      setSaving(true);

      await saveGuideEndTripReportApi({
        assignmentId: selected.assignmentId,
        status,
        report: form,
      });

      alert(status === "SUBMITTED" ? "Đã gửi báo cáo." : "Đã lưu bản nháp.");
      setMode("LIST");
      await loadData();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không thể lưu báo cáo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GuideShell guide={guide}>
      <section className="space-y-7 pb-24 xl:pb-0">
        <section className="rounded-[32px] border border-[#dfe8ea]/70 bg-white/80 px-7 py-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] backdrop-blur-md">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.26em] text-[#9b4500]">
                Báo cáo kết thúc chuyến
              </p>

              <h1 className="text-[32px] font-black leading-[1.12] tracking-[-0.035em] text-[#005c66] md:text-[30px]">
                Tổng hợp báo cáo sau tour
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-medium leading-7 text-[#536163] md:text-base">
                Quản lý báo cáo sau khi kết thúc tour, theo dõi tour đã kết thúc
                nhưng chưa có báo cáo và xem lại toàn bộ nội dung đã gửi.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <ReportMetric label="Tổng" value={summary.total} />
              <ReportMetric label="Cần báo cáo" value={summary.mustReport} danger />
              <ReportMetric label="Bản nháp" value={summary.draft} />
              <ReportMetric label="Đã gửi" value={summary.submitted} />
            </div>
          </div>
        </section>

        {mode === "LIST" ? (
          <>
            <section className="rounded-[30px] border border-[#dfe8ea] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  <FilterButton active={filter === "ALL"} onClick={() => setFilter("ALL")}>
                    Tất cả
                  </FilterButton>
                  <FilterButton
                    active={filter === "MUST_REPORT"}
                    onClick={() => setFilter("MUST_REPORT")}
                  >
                    Cảnh báo chưa báo cáo
                  </FilterButton>
                  <FilterButton
                    active={filter === "MISSING"}
                    onClick={() => setFilter("MISSING")}
                  >
                    Chưa viết
                  </FilterButton>
                  <FilterButton
                    active={filter === "DRAFT"}
                    onClick={() => setFilter("DRAFT")}
                  >
                    Bản nháp
                  </FilterButton>
                  <FilterButton
                    active={filter === "SUBMITTED"}
                    onClick={() => setFilter("SUBMITTED")}
                  >
                    Đã gửi
                  </FilterButton>
                </div>

                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm tour, mã tour, mã khởi hành..."
                  className="w-full rounded-full border border-[#dfe8ea] bg-[#f7fbfc] px-5 py-3 text-sm font-semibold outline-none focus:border-[#00606c] xl:w-[380px]"
                />
              </div>
            </section>

            {loading ? (
              <StateBox text="Đang tải danh sách báo cáo..." />
            ) : filteredReports.length === 0 ? (
              <StateBox text="Không có báo cáo phù hợp." />
            ) : (
              <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {filteredReports.map((item) => (
                  <ReportCard
                    key={item.assignmentId}
                    item={item}
                    onWrite={() => openWrite(item)}
                    onDetail={() => openDetail(item)}
                  />
                ))}
              </section>
            )}
          </>
        ) : null}

        {mode === "DETAIL" && selected ? (
          <ReportDetail
            item={selected}
            onBack={() => setMode("LIST")}
            onEdit={() => openWrite(selected)}
          />
        ) : null}

        {mode === "WRITE" && selected ? (
          <ReportForm
            item={selected}
            form={form}
            setForm={setForm}
            saving={saving}
            onBack={() => setMode("LIST")}
            onSaveDraft={() => handleSave("DRAFT")}
            onSubmit={() => handleSave("SUBMITTED")}
          />
        ) : null}
      </section>
    </GuideShell>
  );
}

function ReportCard({
  item,
  onWrite,
  onDetail,
}: {
  item: GuideEndTripReport;
  onWrite: () => void;
  onDetail: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-[#dfe8ea] bg-white shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
        <div className="relative h-52 overflow-hidden bg-[#e5e9ea] md:h-full">
          <img
            src={item.featuredImageUrl || "/images/tours/dalat-cover.jpg"}
            alt={item.tourName}
            className="h-full w-full object-cover"
          />

          {item.mustReport ? (
            <div className="absolute left-4 top-4 rounded-full bg-[#ba1a1a] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] !text-white">
              Cần báo cáo
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(item.reportStatus)}`}>
              {statusText(item.reportStatus)}
            </span>

            <span className="rounded-full bg-[#f1f4f5] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#6e797b]">
              {item.departureCode}
            </span>
          </div>

          <h2 className="line-clamp-2 text-xl font-black text-[#172124]">
            {item.tourName}
          </h2>

          <p className="mt-2 text-sm font-semibold text-[#6e797b]">
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniBox label="Khách" value={String(item.passengerCount)} />
            <MiniBox label="Booking" value={String(item.bookingCount)} />
            <MiniBox label="Ngày" value={`${item.durationDays}N`} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {item.reportStatus === "SUBMITTED" ? (
              <button
                type="button"
                onClick={onDetail}
                className="rounded-full bg-[#00606c] px-5 py-3 text-sm font-black !text-white"
              >
                Xem chi tiết
              </button>
            ) : (
              <button
                type="button"
                onClick={onWrite}
                className="rounded-full bg-[#9b4500] px-5 py-3 text-sm font-black !text-white"
              >
                Viết báo cáo
              </button>
            )}

            {item.reportStatus === "DRAFT" ? (
              <button
                type="button"
                onClick={onDetail}
                className="rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#00606c]"
              >
                Xem bản nháp
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function ReportForm({
  item,
  form,
  setForm,
  saving,
  onBack,
  onSaveDraft,
  onSubmit,
}: {
  item: GuideEndTripReport;
  form: EndTripReportData;
  setForm: (form: EndTripReportData) => void;
  saving: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  function setField<K extends keyof EndTripReportData>(
    key: K,
    value: EndTripReportData[K]
  ) {
    setForm({
      ...form,
      [key]: value,
    });
  }

  function updateArray(
    key: "positiveFeedback" | "improvementFeedback",
    index: number,
    value: string
  ) {
    const next = [...(form[key] || [])];
    next[index] = value;
    setField(key, next);
  }

  function addArrayItem(key: "positiveFeedback" | "improvementFeedback") {
    setField(key, [...(form[key] || []), ""]);
  }

  function addExpense() {
    const next: EndTripReportExpense = {
      title: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      note: "",
    };

    setField("expenses", [...(form.expenses || []), next]);
  }

  function updateExpense(
    index: number,
    key: keyof EndTripReportExpense,
    value: string | number
  ) {
    const next = [...(form.expenses || [])];
    next[index] = {
      ...next[index],
      [key]: value,
    };
    setField("expenses", next);
  }

  const totalExpense = (form.expenses || []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return (
    <section className="space-y-7">
      <div className="rounded-[32px] bg-[#00606c] p-7 text-white">
        <p className="text-xs font-black uppercase tracking-[0.24em] !text-[#9defff]">
          Viết báo cáo kết thúc tour
        </p>

        <h2 className="mt-3 text-3xl font-black !text-white">{item.tourName}</h2>

        <p className="mt-2 text-sm font-semibold !text-white/80">
          {item.tourCode} • {formatDate(item.startDate)} -{" "}
          {formatDate(item.endDate)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-12">
        <section className="rounded-[32px] bg-white p-7 shadow-sm xl:col-span-7">
          <SectionTitle icon="📝" title="Tóm tắt tình hình đoàn" />

          <TextArea
            label="Tình trạng chung"
            value={form.generalSummary || ""}
            onChange={(value) => setField("generalSummary", value)}
            placeholder="Nhập tóm tắt về sức khỏe, tinh thần, mức độ hài lòng chung của đoàn..."
          />

          <div className="mt-5">
            <TextArea
              label="Sự cố phát sinh hoặc lưu ý trong chuyến"
              value={form.incidentSummary || ""}
              onChange={(value) => setField("incidentSummary", value)}
              placeholder="Ghi nhận sự cố, thay đổi lịch trình, khách cần hỗ trợ đặc biệt..."
            />
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-7 shadow-sm xl:col-span-5">
          <SectionTitle icon="💳" title="Chi phí phát sinh" />

          <div className="space-y-3">
            {(form.expenses || []).map((expense, index) => (
              <div key={index} className="rounded-[22px] bg-[#f7fbfc] p-4">
                <input
                  value={expense.title}
                  onChange={(event) =>
                    updateExpense(index, "title", event.target.value)
                  }
                  placeholder="Tên khoản chi"
                  className="mb-3 w-full rounded-full border border-[#dfe8ea] px-4 py-2 text-sm font-semibold outline-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(event) =>
                      updateExpense(index, "amount", Number(event.target.value))
                    }
                    placeholder="Số tiền"
                    className="rounded-full border border-[#dfe8ea] px-4 py-2 text-sm font-semibold outline-none"
                  />

                  <input
                    type="date"
                    value={expense.date || ""}
                    onChange={(event) =>
                      updateExpense(index, "date", event.target.value)
                    }
                    className="rounded-full border border-[#dfe8ea] px-4 py-2 text-sm font-semibold outline-none"
                  />
                </div>

                <input
                  value={expense.note || ""}
                  onChange={(event) =>
                    updateExpense(index, "note", event.target.value)
                  }
                  placeholder="Ghi chú khoản chi"
                  className="mt-3 w-full rounded-full border border-[#dfe8ea] px-4 py-2 text-sm font-semibold outline-none"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addExpense}
              className="w-full rounded-[22px] border-2 border-dashed border-[#9defff] py-4 text-sm font-black text-[#00606c]"
            >
              + Thêm khoản chi mới
            </button>
          </div>

          <div className="mt-6 border-t border-dashed border-[#dfe8ea] pt-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6e797b]">
              Tổng chi phát sinh
            </p>
            <p className="mt-1 text-3xl font-black text-[#9b4500]">
              {formatMoney(totalExpense)}
            </p>
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-7 shadow-sm xl:col-span-12">
          <SectionTitle icon="💬" title="Phản hồi từ khách hàng" />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FeedbackBox
              title="Điểm khách hài lòng"
              values={form.positiveFeedback || [""]}
              onChange={(index, value) =>
                updateArray("positiveFeedback", index, value)
              }
              onAdd={() => addArrayItem("positiveFeedback")}
              placeholder="Nhập lời khen hoặc điểm khách hài lòng..."
            />

            <FeedbackBox
              title="Điểm cần cải thiện"
              values={form.improvementFeedback || [""]}
              onChange={(index, value) =>
                updateArray("improvementFeedback", index, value)
              }
              onAdd={() => addArrayItem("improvementFeedback")}
              placeholder="Nhập góp ý hoặc điểm cần cải thiện..."
            />
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-7 shadow-sm xl:col-span-12">
          <SectionTitle icon="✅" title="Đánh giá và đề xuất sau tour" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[220px_1fr_1fr]">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6e797b]">
                Điểm tổng quan
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.overallRating || 5}
                onChange={(event) =>
                  setField("overallRating", Number(event.target.value))
                }
                className="w-full rounded-[20px] border border-[#dfe8ea] px-4 py-3 text-sm font-semibold outline-none"
              />
            </div>

            <InputBlock
              label="Đề xuất cải thiện"
              value={form.recommendation || ""}
              onChange={(value) => setField("recommendation", value)}
              placeholder="Ví dụ: tăng thời gian tự do, đổi nhà hàng..."
            />

            <InputBlock
              label="Việc cần điều hành xử lý"
              value={form.nextAction || ""}
              onChange={(value) => setField("nextAction", value)}
              placeholder="Ví dụ: đối soát chi phí, liên hệ khách..."
            />
          </div>
        </section>
      </div>

      <div className="rounded-[32px] bg-[#007b8a] p-7 text-white">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-black !text-white">
              Xác nhận hoàn tất báo cáo
            </h3>
            <p className="mt-2 text-sm font-semibold !text-white/80">
              Sau khi gửi, báo cáo sẽ được lưu vào hệ thống để điều hành đối soát
              và theo dõi chất lượng tour.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-full bg-white/10 px-6 py-3 text-sm font-black !text-white"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="rounded-full bg-white/15 px-6 py-3 text-sm font-black !text-white"
            >
              Lưu bản nháp
            </button>

            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="rounded-full bg-[#9b4500] px-7 py-3 text-sm font-black !text-white"
            >
              Gửi báo cáo kết thúc tour
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportDetail({
  item,
  onBack,
  onEdit,
}: {
  item: GuideEndTripReport;
  onBack: () => void;
  onEdit: () => void;
}) {
  const report = normalizeReport(item.report);

  const totalExpense = (report.expenses || []).reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  return (
    <section className="space-y-7">
      <div className="rounded-[32px] bg-white p-7 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-black text-[#00606c]"
        >
          ← Quay lại danh sách
        </button>

        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9b4500]">
          Chi tiết báo cáo
        </p>

        <h2 className="mt-2 text-3xl font-black text-[#00606c]">
          {item.tourName}
        </h2>

        <p className="mt-2 text-sm font-semibold text-[#6e797b]">
          {item.tourCode} • {formatDate(item.startDate)} -{" "}
          {formatDate(item.endDate)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-12">
        <DetailBlock title="Tóm tắt tình hình đoàn" className="xl:col-span-7">
          <p>{report.generalSummary || "Chưa có nội dung."}</p>
        </DetailBlock>

        <DetailBlock title="Sự cố / lưu ý" className="xl:col-span-5">
          <p>{report.incidentSummary || "Không ghi nhận sự cố."}</p>
        </DetailBlock>

        <DetailBlock title="Chi phí phát sinh" className="xl:col-span-5">
          {(report.expenses || []).length === 0 ? (
            <p>Không có chi phí phát sinh.</p>
          ) : (
            <div className="space-y-3">
              {(report.expenses || []).map((expense, index) => (
                <div
                  key={index}
                  className="flex justify-between rounded-[18px] bg-[#f7fbfc] p-4"
                >
                  <div>
                    <p className="font-black text-[#172124]">{expense.title}</p>
                    <p className="text-sm font-semibold text-[#6e797b]">
                      {expense.date || "Không có ngày"} • {expense.note}
                    </p>
                  </div>
                  <p className="font-black text-[#9b4500]">
                    {formatMoney(expense.amount)}
                  </p>
                </div>
              ))}

              <div className="border-t border-dashed border-[#dfe8ea] pt-4 text-right text-xl font-black text-[#9b4500]">
                Tổng: {formatMoney(totalExpense)}
              </div>
            </div>
          )}
        </DetailBlock>

        <DetailBlock title="Phản hồi khách hàng" className="xl:col-span-7">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FeedbackDetail
              title="Điểm hài lòng"
              values={report.positiveFeedback || []}
            />
            <FeedbackDetail
              title="Điểm cần cải thiện"
              values={report.improvementFeedback || []}
            />
          </div>
        </DetailBlock>

        <DetailBlock title="Đánh giá & đề xuất" className="xl:col-span-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MiniBox label="Điểm tổng quan" value={`${report.overallRating || 5}/5`} />
            <MiniText label="Đề xuất" value={report.recommendation} />
            <MiniText label="Việc cần xử lý" value={report.nextAction} />
          </div>
        </DetailBlock>
      </div>

      {item.reportStatus !== "SUBMITTED" ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full bg-[#9b4500] px-7 py-3 text-sm font-black !text-white"
        >
          Tiếp tục chỉnh sửa báo cáo
        </button>
      ) : null}
    </section>
  );
}

function ReportMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="rounded-[22px] bg-[#f7fbfc] px-5 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </p>
      <p className={danger ? "mt-1 text-2xl font-black text-[#ba1a1a]" : "mt-1 text-2xl font-black text-[#00606c]"}>
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-[#00606c] px-5 py-3 text-sm font-black !text-white"
          : "rounded-full bg-[#f1f4f5] px-5 py-3 text-sm font-bold text-[#3e494b]"
      }
    >
      {children}
    </button>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h3 className="mb-5 flex items-center gap-3 text-2xl font-black text-[#172124]">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ddf9ff] text-xl">
        {icon}
      </span>
      {title}
    </h3>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        placeholder={placeholder}
        className="w-full rounded-[22px] border border-[#dfe8ea] bg-[#f7fbfc] px-4 py-3 text-sm font-semibold outline-none focus:border-[#00606c]"
      />
    </div>
  );
}

function InputBlock({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#6e797b]">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[20px] border border-[#dfe8ea] px-4 py-3 text-sm font-semibold outline-none"
      />
    </div>
  );
}

function FeedbackBox({
  title,
  values,
  onChange,
  onAdd,
  placeholder,
}: {
  title: string;
  values: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-[26px] bg-[#f7fbfc] p-5">
      <h4 className="mb-4 font-black text-[#00606c]">{title}</h4>
      <div className="space-y-3">
        {values.map((value, index) => (
          <input
            key={index}
            value={value}
            onChange={(event) => onChange(index, event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-full border border-[#dfe8ea] bg-white px-4 py-3 text-sm font-semibold outline-none"
          />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#00606c]"
        >
          + Thêm dòng
        </button>
      </div>
    </div>
  );
}

function DetailBlock({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[32px] bg-white p-7 shadow-sm ${className}`}>
      <h3 className="mb-4 text-xl font-black text-[#00606c]">{title}</h3>
      <div className="whitespace-pre-line text-sm font-semibold leading-7 text-[#536163]">
        {children}
      </div>
    </section>
  );
}

function FeedbackDetail({ title, values }: { title: string; values: string[] }) {
  const list = values.filter(Boolean);

  return (
    <div className="rounded-[22px] bg-[#f7fbfc] p-5">
      <h4 className="mb-3 font-black text-[#172124]">{title}</h4>
      {list.length === 0 ? (
        <p>Chưa có nội dung.</p>
      ) : (
        <ul className="list-inside list-disc space-y-2">
          {list.map((value, index) => (
            <li key={index}>{value}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#f7fbfc] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91a0a4]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-[#00606c]">{value}</p>
    </div>
  );
}

function MiniText({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-[20px] bg-[#f7fbfc] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#91a0a4]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#536163]">
        {value || "Chưa cập nhật"}
      </p>
    </div>
  );
}

function StateBox({ text }: { text: string }) {
  return (
    <div className="rounded-[30px] border border-[#dfe8ea] bg-white p-10 text-center shadow-sm">
      <p className="font-black text-[#00606c]">{text}</p>
    </div>
  );
}
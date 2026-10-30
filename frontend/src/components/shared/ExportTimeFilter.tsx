"use client";

import React from "react";

export type TimeFilterOptions = {
  type: "month" | "quarter" | "custom";
  month: number; // 1-12
  quarter: number; // 1-4
  year: number;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
};

interface ExportTimeFilterProps {
  value: TimeFilterOptions;
  onChange: (value: TimeFilterOptions) => void;
  className?: string;
}

export default function ExportTimeFilter({
  value,
  onChange,
  className = "",
}: ExportTimeFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i); // 5 năm trước tới 5 năm sau

  const handleTypeChange = (type: "month" | "quarter" | "custom") => {
    const todayStr = new Date().toISOString().slice(0, 10);
    onChange({
      ...value,
      type,
      customStartDate: value.customStartDate || todayStr,
      customEndDate: value.customEndDate || todayStr,
    });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, month: Number(e.target.value) });
  };

  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, quarter: Number(e.target.value) });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, year: Number(e.target.value) });
  };

  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center ${className}`}>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6e797b]">
          Loại thời gian
        </label>
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f1f4f5] p-1.5 ring-1 ring-[#ebeeef]">
          <button
            type="button"
            onClick={() => handleTypeChange("month")}
            className={`rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
              value.type === "month"
                ? "bg-[#00606c] text-white shadow-sm"
                : "text-[#3e494b] hover:bg-white/50"
            }`}
          >
            Theo tháng
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("quarter")}
            className={`rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
              value.type === "quarter"
                ? "bg-[#00606c] text-white shadow-sm"
                : "text-[#3e494b] hover:bg-white/50"
            }`}
          >
            Theo quý
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("custom")}
            className={`rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
              value.type === "custom"
                ? "bg-[#00606c] text-white shadow-sm"
                : "text-[#3e494b] hover:bg-white/50"
            }`}
          >
            Tùy chỉnh
          </button>
        </div>
      </div>

      {value.type === "month" && (
        <div className="w-full sm:w-28">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6e797b]">
            Chọn tháng
          </label>
          <select
            value={value.month}
            onChange={handleMonthChange}
            className="w-full h-11 rounded-2xl border-none bg-[#f1f4f5] px-4 text-sm font-bold text-[#181c1d] outline-none ring-1 ring-[#bdc8cb]/30 focus:ring-2 focus:ring-[#00606c]/30"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {String(i + 1).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.type === "quarter" && (
        <div className="w-full sm:w-28">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6e797b]">
            Chọn quý
          </label>
          <select
            value={value.quarter}
            onChange={handleQuarterChange}
            className="w-full h-11 rounded-2xl border-none bg-[#f1f4f5] px-4 text-sm font-bold text-[#181c1d] outline-none ring-1 ring-[#bdc8cb]/30 focus:ring-2 focus:ring-[#00606c]/30"
          >
            <option value={1}>Quý I</option>
            <option value={2}>Quý II</option>
            <option value={3}>Quý III</option>
            <option value={4}>Quý IV</option>
          </select>
        </div>
      )}

      {value.type === "custom" && (
        <>
          <div className="w-full sm:w-40">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6e797b]">
              Từ ngày
            </label>
            <input
              type="date"
              value={value.customStartDate || ""}
              onChange={(e) => {
                const newStart = e.target.value;
                if (value.customEndDate && newStart > value.customEndDate) {
                  alert("Ngày bắt đầu không được lớn hơn ngày kết thúc.");
                  return;
                }
                onChange({ ...value, customStartDate: newStart });
              }}
              className="w-full h-11 rounded-2xl border-none bg-[#f1f4f5] px-4 text-sm font-bold text-[#181c1d] outline-none ring-1 ring-[#bdc8cb]/30 focus:ring-2 focus:ring-[#00606c]/30"
            />
          </div>

          <div className="w-full sm:w-40">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6e797b]">
              Đến ngày
            </label>
            <input
              type="date"
              value={value.customEndDate || ""}
              onChange={(e) => {
                const newEnd = e.target.value;
                if (value.customStartDate && newEnd < value.customStartDate) {
                  alert("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
                  return;
                }
                onChange({ ...value, customEndDate: newEnd });
              }}
              className="w-full h-11 rounded-2xl border-none bg-[#f1f4f5] px-4 text-sm font-bold text-[#181c1d] outline-none ring-1 ring-[#bdc8cb]/30 focus:ring-2 focus:ring-[#00606c]/30"
            />
          </div>
        </>
      )}

      {value.type !== "custom" && (
        <div className="w-full sm:w-28">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#6e797b]">
            Năm
          </label>
          <select
            value={value.year}
            onChange={handleYearChange}
            className="w-full h-11 rounded-2xl border-none bg-[#f1f4f5] px-4 text-sm font-bold text-[#181c1d] outline-none ring-1 ring-[#bdc8cb]/30 focus:ring-2 focus:ring-[#00606c]/30"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to format report date display
 */
export function formatReportTimeLabel(filter: TimeFilterOptions): string {
  if (filter.type === "month") {
    return `Tháng ${String(filter.month).padStart(2, "0")}/${filter.year}`;
  }
  if (filter.type === "quarter") {
    const romanQuarters = ["I", "II", "III", "IV"];
    return `Quý ${romanQuarters[filter.quarter - 1]}/${filter.year}`;
  }
  
  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return "__/__/____";
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };
  return `Từ ngày ${formatDateStr(filter.customStartDate)} đến ngày ${formatDateStr(filter.customEndDate)}`;
}

/**
 * Helper function to format filename suffix
 */
export function formatReportFilenameSuffix(filter: TimeFilterOptions): string {
  if (filter.type === "month") {
    return `thang-${String(filter.month).padStart(2, "0")}-${filter.year}`;
  }
  if (filter.type === "quarter") {
    return `quy-${filter.quarter}-${filter.year}`;
  }
  const start = filter.customStartDate ? filter.customStartDate.replace(/-/g, "") : "start";
  const end = filter.customEndDate ? filter.customEndDate.replace(/-/g, "") : "end";
  return `tuy-chinh-${start}-${end}`;
}

/**
 * Helper function to filter items by a date field using the selected TimeFilterOptions.
 * Handles invalid date strings safely.
 */
export function filterItemsByTime<T>(
  items: T[],
  dateGetter: (item: T) => string | Date | null | undefined,
  filter: TimeFilterOptions
): T[] {
  return items.filter((item) => {
    const rawDate = dateGetter(item);
    if (!rawDate) return false;
    
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return false; // Safe check for invalid dates
    
    if (filter.type === "custom") {
      if (!filter.customStartDate || !filter.customEndDate) return true;
      const start = new Date(filter.customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filter.customEndDate);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    
    const itemYear = date.getFullYear();
    if (itemYear !== filter.year) return false;

    if (filter.type === "month") {
      return date.getMonth() + 1 === filter.month;
    } else {
      const month = date.getMonth() + 1;
      const itemQuarter = Math.ceil(month / 3);
      return itemQuarter === filter.quarter;
    }
  });
}

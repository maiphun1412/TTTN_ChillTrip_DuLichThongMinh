"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface SeatWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  availableSeats: number;
  excessCount: number;
}

export default function SeatWarningModal({
  isOpen,
  onClose,
  selectedCount,
  availableSeats,
  excessCount,
}: SeatWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl transition-all scale-100">
        <div className="flex items-center justify-between border-b border-[#ebeeef] pb-4">
          <div className="flex items-center gap-2.5 text-[#ba1a1a]">
            <AlertTriangle className="h-6 h-6 animate-pulse" />
            <h3 className="text-lg font-black tracking-tight">Cảnh báo vượt số chỗ</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f4f5] hover:bg-[#dfe3e4] text-[#3e494b]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="my-6 space-y-4">
          <p className="text-sm font-bold text-[#3e494b] leading-relaxed">
            Số lượng hành khách bạn chọn đang vượt quá số chỗ trống còn lại trên lịch khởi hành này.
          </p>

          <div className="rounded-2xl bg-[#ffdad6]/30 p-4 border border-[#ffb4ab]/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-[#3e494b]">Tổng khách đang chọn:</span>
              <span className="font-black text-[#ba1a1a]">{selectedCount} người</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-[#3e494b]">Số chỗ trống còn lại:</span>
              <span className="font-black text-[#006c7c]">{availableSeats} chỗ</span>
            </div>
            <div className="my-2 border-t border-[#ffb4ab]/30" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-[#3e494b]">Số người vượt quá:</span>
              <span className="font-black text-[#ba1a1a]">{excessCount} người</span>
            </div>
          </div>

          <p className="text-xs font-semibold text-[#ba1a1a] bg-red-50 p-3 rounded-xl border border-red-100">
            Vui lòng giảm ít nhất <strong className="font-black">{excessCount}</strong> người hoặc chọn lịch khởi hành khác để tiếp tục đặt tour.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[#ba1a1a] py-3 text-sm font-black text-white hover:brightness-95 active:scale-95 transition-all shadow-md shadow-red-900/10"
          >
            Đã hiểu và điều chỉnh
          </button>
        </div>
      </div>
    </div>
  );
}

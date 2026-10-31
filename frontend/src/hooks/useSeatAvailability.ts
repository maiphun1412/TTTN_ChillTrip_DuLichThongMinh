"use client";

import { useEffect, useState, useRef } from "react";

export type SeatAvailabilityParams = {
  tourId: string | number;
  departureId: string | number;
  bookingType: "INDIVIDUAL" | "GROUP";
  adultCount: number;
  childCount: number;
  expectedGuestCount: number;
  availableSeats: number | null | undefined;
  isLoading?: boolean;
};

export type SeatWarningInfo = {
  selected: number;
  available: number;
  excess: number;
};

export function useSeatAvailability({
  tourId,
  departureId,
  bookingType,
  adultCount,
  childCount,
  expectedGuestCount,
  availableSeats,
  isLoading = false,
}: SeatAvailabilityParams) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningInfo, setWarningInfo] = useState<SeatWarningInfo>({
    selected: 0,
    available: 0,
    excess: 0,
  });
  const [isSeatsInvalid, setIsSeatsInvalid] = useState(false);
  const [lastWarnedCount, setLastWarnedCount] = useState(0);

  // Lưu trữ các giá trị trước đó để kiểm tra thay đổi
  const prevTourId = useRef(tourId);
  const prevDepartureId = useRef(departureId);
  const prevBookingType = useRef(bookingType);

  // Tính tổng số lượng khách chiếm chỗ theo quy tắc nghiệp vụ
  const totalGuests =
    bookingType === "GROUP"
      ? Number(expectedGuestCount || 0)
      : Number(adultCount || 0) + Number(childCount || 0);

  const seatsCount = availableSeats === null || availableSeats === undefined ? -1 : Number(availableSeats);

  useEffect(() => {
    // Reset cảnh báo nếu đổi tour, đổi lịch khởi hành hoặc đổi loại booking
    if (
      prevTourId.current !== tourId ||
      prevDepartureId.current !== departureId ||
      prevBookingType.current !== bookingType
    ) {
      setLastWarnedCount(0);
      setIsSeatsInvalid(false);
      setShowWarningModal(false);
      
      prevTourId.current = tourId;
      prevDepartureId.current = departureId;
      prevBookingType.current = bookingType;
      return;
    }

    // Nếu đang load dữ liệu hoặc không có lịch khởi hành thì không báo lỗi
    if (isLoading || !departureId || seatsCount < 0) {
      setIsSeatsInvalid(false);
      return;
    }

    // Kiểm tra tính hợp lệ của số lượng nhập (không âm, không NaN, và phải > 0)
    if (
      isNaN(totalGuests) ||
      totalGuests <= 0 ||
      (bookingType === "INDIVIDUAL" && (isNaN(adultCount) || adultCount < 0 || isNaN(childCount) || childCount < 0)) ||
      (bookingType === "GROUP" && (isNaN(expectedGuestCount) || expectedGuestCount < 0))
    ) {
      setIsSeatsInvalid(false);
      return;
    }

    if (totalGuests > seatsCount) {
      setIsSeatsInvalid(true);
      const excess = totalGuests - seatsCount;

      // CHỐNG LẶP POPUP:
      // 1. Chỉ hiện popup khi số khách tăng lên so với lần cảnh báo trước đó (totalGuests > lastWarnedCount)
      // 2. Hoặc khi chuyển từ trạng thái hợp lệ sang không hợp lệ (lastWarnedCount === 0)
      if (totalGuests > lastWarnedCount) {
        setWarningInfo({
          selected: totalGuests,
          available: seatsCount,
          excess: excess,
        });
        setShowWarningModal(true);
        setLastWarnedCount(totalGuests);
      }
    } else {
      // Khi số lượng trở về mức hợp lệ, tự động xóa lỗi và reset lastWarnedCount
      setIsSeatsInvalid(false);
      setLastWarnedCount(0);
      setShowWarningModal(false);
    }
  }, [
    tourId,
    departureId,
    bookingType,
    adultCount,
    childCount,
    expectedGuestCount,
    seatsCount,
    totalGuests,
    isLoading,
    lastWarnedCount,
  ]);

  const closeWarning = () => {
    setShowWarningModal(false);
  };

  const resetWarning = () => {
    setLastWarnedCount(0);
    setIsSeatsInvalid(false);
    setShowWarningModal(false);
  };

  return {
    isSeatsInvalid,
    warningInfo: isSeatsInvalid
      ? warningInfo
      : { selected: totalGuests, available: seatsCount, excess: Math.max(0, totalGuests - seatsCount) },
    showWarningModal,
    setShowWarningModal,
    closeWarning,
    resetWarning,
    totalGuests,
  };
}

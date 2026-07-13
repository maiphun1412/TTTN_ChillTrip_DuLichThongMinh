import { prisma } from "@/lib/prisma";

function makeBookingCode() {
  return `BK${Date.now()}`;
}

function makeContractCode() {
  return `GCT${Date.now()}`;
}

function makePaymentCode() {
  return `PAY${Date.now()}`;
}

type BookingPassengerInput = {
  passengerType?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  idNumber?: string;
  passportNumber?: string;
  nationality?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  mealNote?: string;
  healthNote?: string;
  roomPreference?: string;
  isBookingContact?: boolean;
};

export const bookingService = {
  async create(input: {
    customerId: number;
    tourId: number;
    departureId: number;
    pickupPointId?: number | null;
    promotionId?: number | null;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    adultCount: number;
    childCount: number;
    specialNotes?: string;
    passengers?: BookingPassengerInput[];
    paymentMethod?: string;

    pickupServiceType?: string;
    pickupProvince?: string;
    pickupAddress?: string;
    pickupFeeId?: number | null;

    bookingType?: "INDIVIDUAL" | "GROUP";
    organizationName?: string;
    representativeName?: string;
    representativePhone?: string;
    representativeEmail?: string;
    expectedGuestCount?: number;
    depositAmount?: number;
    paymentTerms?: string;
    cancellationTerms?: string;
  }) {
    const customerId = BigInt(input.customerId);
    const tourId = BigInt(input.tourId);
    const departureId = BigInt(input.departureId);

    const pickupPointId = input.pickupPointId
      ? BigInt(input.pickupPointId)
      : null;

    const inputPromotionId = input.promotionId
      ? BigInt(input.promotionId)
      : null;

    const bookingType = input.bookingType || "INDIVIDUAL";
    const isGroupBooking = bookingType === "GROUP";

    const customer = await prisma.customers.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

    const tour = await prisma.tours.findUnique({
      where: { id: tourId },
    });

    if (!tour) throw new Error("TOUR_NOT_FOUND");

    const departure = await prisma.departure_schedules.findUnique({
      where: { id: departureId },
    });

    if (!departure) throw new Error("DEPARTURE_NOT_FOUND");

    if (departure.tour_id !== tourId) {
      throw new Error("DEPARTURE_NOT_BELONG_TOUR");
    }

    if (departure.booking_status !== "OPEN") {
      throw new Error("DEPARTURE_NOT_OPEN");
    }

    if (pickupPointId) {
      const pickupPoint = await prisma.pickup_points.findUnique({
        where: { id: pickupPointId },
      });

      if (!pickupPoint) throw new Error("PICKUP_POINT_NOT_FOUND");

      if (pickupPoint.departure_id !== departureId) {
        throw new Error("PICKUP_POINT_NOT_BELONG_DEPARTURE");
      }

      if (!pickupPoint.is_active) {
        throw new Error("PICKUP_POINT_INACTIVE");
      }
    }

    let pickupFeeAmount = 0;
    let pickupProvince: string | null = null;
    let pickupAddress: string | null = null;

    const pickupServiceType = input.pickupServiceType || "MEETING_POINT";

    if (pickupServiceType === "DOOR_TO_DOOR") {
      if (!input.pickupFeeId) throw new Error("PICKUP_FEE_REQUIRED");
      if (!input.pickupAddress?.trim()) throw new Error("PICKUP_ADDRESS_REQUIRED");

      const pickupFee = await prisma.pickup_province_fees.findUnique({
        where: { id: BigInt(input.pickupFeeId) },
      });

      if (!pickupFee) throw new Error("PICKUP_FEE_NOT_FOUND");

      if (pickupFee.departure_id !== departureId) {
        throw new Error("PICKUP_FEE_NOT_BELONG_DEPARTURE");
      }

      if (!pickupFee.is_active) {
        throw new Error("PICKUP_FEE_INACTIVE");
      }

      pickupFeeAmount = Number(pickupFee.fee_amount);
      pickupProvince = pickupFee.province;
      pickupAddress = input.pickupAddress.trim();
    }

    if (isGroupBooking) {
      if (!input.organizationName?.trim()) throw new Error("ORGANIZATION_NAME_REQUIRED");
      if (!input.representativeName?.trim()) throw new Error("REPRESENTATIVE_NAME_REQUIRED");
      if (!input.representativePhone?.trim()) throw new Error("REPRESENTATIVE_PHONE_REQUIRED");
      if (!input.expectedGuestCount || input.expectedGuestCount <= 0) {
        throw new Error("EXPECTED_GUEST_COUNT_REQUIRED");
      }
      if (input.depositAmount === undefined || input.depositAmount <= 0) {
        throw new Error("INVALID_DEPOSIT_AMOUNT");
      }
    }

    const totalPeople = isGroupBooking
      ? Number(input.expectedGuestCount || 0)
      : Number(input.adultCount || 0) + Number(input.childCount || 0);

    if (totalPeople <= 0) throw new Error("INVALID_PEOPLE_COUNT");

    if (!isGroupBooking && departure.available_seats < totalPeople) {
      throw new Error(`NOT_ENOUGH_SEATS:${departure.available_seats}`);
    }

    const passengerInputs = Array.isArray(input.passengers)
      ? input.passengers
          .map((passenger) => ({
            ...passenger,
            fullName: String(passenger.fullName || "").trim(),
          }))
          .filter((passenger) => passenger.fullName.length > 0)
      : [];

    const totalOriginalAmount = isGroupBooking
      ? Number(tour.base_price) * totalPeople
      : Number(tour.base_price) * input.adultCount +
        Number(tour.child_price) * input.childCount;

    let discountAmount = 0;
    let promotionId: bigint | null = null;

    if (inputPromotionId) {
      const promotion = await prisma.promotions.findUnique({
        where: { id: inputPromotionId },
      });

      if (!promotion) throw new Error("PROMOTION_NOT_FOUND");

      const now = new Date();

      if (
        promotion.status !== "ACTIVE" ||
        now < promotion.start_at ||
        now > promotion.end_at
      ) {
        throw new Error("PROMOTION_EXPIRED");
      }

      if (totalOriginalAmount < Number(promotion.min_order_amount)) {
        throw new Error("PROMOTION_NOT_ELIGIBLE");
      }

      if (promotion.promotion_type === "PERCENT") {
        discountAmount =
          (totalOriginalAmount * Number(promotion.discount_value)) / 100;

        if (
          promotion.max_discount_amount !== null &&
          discountAmount > Number(promotion.max_discount_amount)
        ) {
          discountAmount = Number(promotion.max_discount_amount);
        }
      } else {
        discountAmount = Number(promotion.discount_value);
      }

      promotionId = promotion.id;
    }

    const totalPayableAmount = Math.max(
      totalOriginalAmount - discountAmount + pickupFeeAmount,
      0
    );

    const depositAmount = isGroupBooking
      ? Math.min(Number(input.depositAmount || 0), totalPayableAmount)
      : totalPayableAmount;

    const booking = await prisma.$transaction(async (tx) => {
      const latestDeparture = await tx.departure_schedules.findUnique({
        where: { id: departureId },
      });

      if (!latestDeparture) throw new Error("DEPARTURE_NOT_FOUND");

      if (latestDeparture.booking_status !== "OPEN") {
        throw new Error("DEPARTURE_NOT_OPEN");
      }

      if (!isGroupBooking && latestDeparture.available_seats < totalPeople) {
        throw new Error(`NOT_ENOUGH_SEATS:${latestDeparture.available_seats}`);
      }

      const created = await tx.bookings.create({
        data: {
          booking_code: makeBookingCode(),
          customer_id: customerId,
          tour_id: tourId,
          departure_id: departureId,
          pickup_point_id: pickupPointId,
          promotion_id: promotionId,
          booking_status: isGroupBooking ? "PENDING_CONTRACT" : "PENDING",
          contact_name: input.contactName,
          contact_phone: input.contactPhone,
          contact_email: input.contactEmail || null,
          adult_count: isGroupBooking ? totalPeople : input.adultCount,
          child_count: isGroupBooking ? 0 : input.childCount,
          total_original_amount: totalOriginalAmount,
          discount_amount: discountAmount,
          total_payable_amount: totalPayableAmount,
          reserved_until: isGroupBooking
            ? null
            : new Date(Date.now() + 30 * 60 * 1000),
          special_notes: input.specialNotes || null,
          pickup_service_type: pickupServiceType,
          pickup_province: pickupProvince,
          pickup_address: pickupAddress,
          pickup_fee_amount: pickupFeeAmount,
        },
      });

      if (isGroupBooking) {
        await tx.group_contracts.create({
  data: {
    booking_id: created.id,
    contract_code: makeContractCode(),
    customer_id: customerId,
    organization_name: input.organizationName!.trim(),
    representative_name: input.representativeName?.trim() || null,
    representative_phone: input.representativePhone?.trim() || null,
    representative_email: input.representativeEmail?.trim() || null,
    tour_id: tourId,
    departure_id: departureId,
    expected_guest_count: totalPeople,
    contract_value: totalPayableAmount,
    payment_terms: input.paymentTerms || null,
    cancellation_terms: input.cancellationTerms || null,
    contract_status: "DRAFT",
    created_by: null,
  },
});
      }

      const passengersToCreate =
        passengerInputs.length > 0
          ? passengerInputs
          : [
              {
                passengerType: "ADULT",
                fullName: input.contactName,
                phone: input.contactPhone,
                email: input.contactEmail,
                isBookingContact: true,
              },
            ];

      await tx.booking_passengers.createMany({
        data: passengersToCreate.map((passenger, index) => ({
          booking_id: created.id,
          passenger_type:
            passenger.passengerType ||
            (index < input.adultCount ? "ADULT" : "CHILD"),
          full_name: passenger.fullName,
          gender: passenger.gender || null,
          date_of_birth: passenger.dateOfBirth
            ? new Date(passenger.dateOfBirth)
            : null,
          phone: passenger.phone || null,
          email: passenger.email || null,
          id_number: passenger.idNumber || null,
          passport_number: passenger.passportNumber || null,
          nationality: passenger.nationality || null,
          emergency_contact_name: passenger.emergencyContactName || null,
          emergency_contact_phone: passenger.emergencyContactPhone || null,
          meal_note: passenger.mealNote || null,
          health_note: passenger.healthNote || null,
          room_preference: passenger.roomPreference || null,
          is_booking_contact:
            passenger.isBookingContact !== undefined
              ? passenger.isBookingContact
              : index === 0,
        })),
      });

      if (!isGroupBooking) {
        await tx.departure_schedules.update({
          where: { id: departureId },
          data: {
            available_seats: { decrement: totalPeople },
            booked_seats: { increment: totalPeople },
          },
        });
      }

      await tx.debts.create({
        data: {
          booking_id: created.id,
          customer_id: customerId,
          total_amount: totalPayableAmount,
          paid_amount: 0,
          remaining_amount: totalPayableAmount,
          debt_status: "UNPAID",
          due_date: new Date(latestDeparture.start_date),
        },
      });

      await tx.payments.create({
        data: {
          booking_id: created.id,
          payment_code: makePaymentCode(),
          payment_method: input.paymentMethod || "BANK_TRANSFER",
          amount: depositAmount,
          payment_status: "PENDING",
          transaction_code: null,
          proof_url: null,
          paid_at: null,
          created_by: null,
        },
      });

      if (promotionId) {
        await tx.booking_promotions.create({
          data: {
            booking_id: created.id,
            promotion_id: promotionId,
            discount_amount: discountAmount,
          },
        });

        await tx.promotions.update({
          where: { id: promotionId },
          data: {
            used_count: { increment: 1 },
          },
        });
      }

      return created;
    });

    return booking;
  },

  async getById(id: number) {
    const booking = await prisma.bookings.findUnique({
      where: { id: BigInt(id) },
      include: {
  customers: true,
  tours: true,
  departure_schedules: true,
  payments: true,
  debts: true,
  booking_passengers: true,
  booking_promotions: true,
  group_contracts: true,
},
    });

    if (!booking) throw new Error("BOOKING_NOT_FOUND");

    return booking;
  },

  async cancel(id: number, reason: string, requestedBy: number) {
    const bookingId = BigInt(id);
    const requestedById = BigInt(requestedBy);

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
      include: {
        departure_schedules: true,
        debts: true,
      },
    });

    if (!booking) throw new Error("BOOKING_NOT_FOUND");

    if (booking.booking_status === "CANCELLED") {
      throw new Error("BOOKING_ALREADY_CANCELLED");
    }
const totalPeople = booking.adult_count + booking.child_count;

const groupContract = await prisma.group_contracts.findFirst({
  where: {
    booking_id: bookingId,
  },
});

const isGroupBooking = Boolean(groupContract);
    return prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.bookings.update({
        where: { id: bookingId },
        data: {
          booking_status: "CANCELLED",
          cancelled_at: new Date(),
          updated_by: requestedById,
        },
      });

      if (!isGroupBooking) {
        await tx.departure_schedules.update({
          where: { id: booking.departure_id },
          data: {
            available_seats: { increment: totalPeople },
            booked_seats: { decrement: totalPeople },
          },
        });
      }

      if (booking.debts) {
        await tx.debts.update({
          where: { booking_id: booking.id },
          data: {
            debt_status: "PAID",
            remaining_amount: 0,
          },
        });
      }

      await tx.cancellation_requests.create({
        data: {
          booking_id: booking.id,
          requested_by: requestedById,
          reason,
          request_status: "APPROVED",
          requested_at: new Date(),
          processed_at: new Date(),
          processed_by: requestedById,
        },
      });

      return updatedBooking;
    });
  },
};
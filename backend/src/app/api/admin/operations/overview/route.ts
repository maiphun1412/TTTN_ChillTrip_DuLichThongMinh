import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET() {
  try {
    const revenueRows: any = await prisma.$queryRawUnsafe(`
      SELECT
        ISNULL(SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END), 0) AS total_revenue,
        COUNT(*) AS total_payments,
        SUM(CASE WHEN payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_payments,
        SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_payments,
        SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) AS failed_payments
      FROM payments
    `);

    const debtRows: any = await prisma.$queryRawUnsafe(`
      SELECT
        ISNULL(SUM(total_amount), 0) AS total_debt,
        ISNULL(SUM(paid_amount), 0) AS paid_amount,
        ISNULL(SUM(remaining_amount), 0) AS remaining_amount,
        SUM(CASE WHEN debt_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_count,
        SUM(CASE WHEN debt_status = 'PARTIAL' THEN 1 ELSE 0 END) AS partial_count,
        SUM(CASE WHEN debt_status = 'PAID' THEN 1 ELSE 0 END) AS paid_count
      FROM debts
    `);

    const refundRows: any = await prisma.$queryRawUnsafe(`
      SELECT
        ISNULL(SUM(CASE WHEN refund_status IN ('DONE', 'APPROVED') THEN refund_amount ELSE 0 END), 0) AS total_refund,
        COUNT(*) AS total_refunds,
        SUM(CASE WHEN refund_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_refunds,
        SUM(CASE WHEN refund_status IN ('DONE', 'APPROVED') THEN 1 ELSE 0 END) AS completed_refunds
      FROM refunds
    `);

    const serviceCostRows: any = await prisma.$queryRawUnsafe(`
      SELECT
        ISNULL((SELECT SUM(unit_price) FROM flight_services), 0) AS flight_cost,
        ISNULL((SELECT SUM(unit_price) FROM vehicle_services), 0) AS vehicle_cost,
        ISNULL((SELECT SUM(unit_price) FROM hotel_services), 0) AS hotel_cost,
        ISNULL((SELECT COUNT(*) FROM flight_services), 0) AS flight_count,
        ISNULL((SELECT COUNT(*) FROM vehicle_services), 0) AS vehicle_count,
        ISNULL((SELECT COUNT(*) FROM hotel_services), 0) AS hotel_count
    `);

    const revenue = revenueRows?.[0] || {};
    const debt = debtRows?.[0] || {};
    const refund = refundRows?.[0] || {};
    const serviceCost = serviceCostRows?.[0] || {};

    const totalRevenue = Number(revenue.total_revenue || 0);
    const totalRefund = Number(refund.total_refund || 0);
    const flightCost = Number(serviceCost.flight_cost || 0);
    const vehicleCost = Number(serviceCost.vehicle_cost || 0);
    const hotelCost = Number(serviceCost.hotel_cost || 0);
    const totalServiceCost = flightCost + vehicleCost + hotelCost;
    const netCash = totalRevenue - totalRefund;
    const estimatedProfit = totalRevenue - totalRefund - totalServiceCost;

    return NextResponse.json({
      success: true,
      data: serialize({
        revenue: {
          total_revenue: totalRevenue,
          total_payments: revenue.total_payments || 0,
          paid_payments: revenue.paid_payments || 0,
          pending_payments: revenue.pending_payments || 0,
          failed_payments: revenue.failed_payments || 0,
        },
        debt: {
          total_debt: debt.total_debt || 0,
          paid_amount: debt.paid_amount || 0,
          remaining_amount: debt.remaining_amount || 0,
          unpaid_count: debt.unpaid_count || 0,
          partial_count: debt.partial_count || 0,
          paid_count: debt.paid_count || 0,
        },
        refund: {
          total_refund: totalRefund,
          total_refunds: refund.total_refunds || 0,
          pending_refunds: refund.pending_refunds || 0,
          completed_refunds: refund.completed_refunds || 0,
        },
        service_cost: {
          flight_cost: flightCost,
          vehicle_cost: vehicleCost,
          hotel_cost: hotelCost,
          total_service_cost: totalServiceCost,
          flight_count: serviceCost.flight_count || 0,
          vehicle_count: serviceCost.vehicle_count || 0,
          hotel_count: serviceCost.hotel_count || 0,
        },
        summary: {
          net_cash: netCash,
          estimated_profit: estimatedProfit,
        },
      }),
    });
  } catch (error) {
    console.error("GET_ADMIN_FINANCE_OVERVIEW_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được tổng quan tài chính" },
      { status: 500 }
    );
  }
}
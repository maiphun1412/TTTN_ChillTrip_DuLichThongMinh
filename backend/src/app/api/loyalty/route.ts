import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCustomerId(req: NextRequest) {
  const url = new URL(req.url);

  const fromQuery = url.searchParams.get("customerId");
  const fromHeader = req.headers.get("x-customer-id");
  const fromCookie =
    req.cookies.get("customerId")?.value ||
    req.cookies.get("customer_id")?.value;

  const raw = fromQuery || fromHeader || fromCookie;
  const id = Number(raw);

  if (!id || Number.isNaN(id)) return null;
  return id;
}

export async function GET(req: NextRequest) {
  try {
    const customerId = getCustomerId(req);

    if (!customerId) {
      return NextResponse.json(
        {
          success: false,
          message: "Thiếu customerId để lấy điểm tích lũy",
        },
        { status: 400 }
      );
    }

    const walletRows = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT TOP 1
        id,
        customer_id,
        total_points,
        available_points,
        used_points,
        created_at,
        updated_at
      FROM loyalty_wallets
      WHERE customer_id = @P1
      `,
      customerId
    );

    const wallet = walletRows[0] || {
      id: null,
      customer_id: customerId,
      total_points: 0,
      available_points: 0,
      used_points: 0,
      created_at: null,
      updated_at: null,
    };

    const transactions = await prisma.$queryRawUnsafe<any[]>(
      `
      SELECT TOP 50
        id,
        customer_id,
        booking_id,
        type,
        points,
        description,
        created_at
      FROM loyalty_transactions
      WHERE customer_id = @P1
      ORDER BY created_at DESC
      `,
      customerId
    );

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          id: wallet.id,
          customerId: wallet.customer_id,
          totalPoints: Number(wallet.total_points || 0),
          availablePoints: Number(wallet.available_points || 0),
          usedPoints: Number(wallet.used_points || 0),
          createdAt: wallet.created_at,
          updatedAt: wallet.updated_at,
        },
        transactions: transactions.map((item) => ({
          id: item.id,
          customerId: item.customer_id,
          bookingId: item.booking_id,
          type: item.type,
          points: Number(item.points || 0),
          description: item.description || "",
          createdAt: item.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/loyalty error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Không lấy được thông tin điểm tích lũy",
      },
      { status: 500 }
    );
  }
}
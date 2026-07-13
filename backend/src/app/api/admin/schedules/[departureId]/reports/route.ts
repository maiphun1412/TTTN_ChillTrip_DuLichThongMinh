import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(
  req: Request,
  context: { params: Promise<{ departureId: string }> }
) {
  try {
    const { departureId } = await context.params;
    const id = Number(departureId);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID lịch khởi hành không hợp lệ" },
        { status: 400 }
      );
    }

    const reports = await prisma.$queryRawUnsafe(`
      SELECT
        id,
        departure_id,
        report_status,
        current_location,
        content,
        present_count,
        absent_count,

        issue_type,
        priority_level,
        handled_action,
        next_action,

        created_at
      FROM operation_reports
      WHERE departure_id = ${id}
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(reports),
    });
  } catch (error) {
    console.error("GET_OPERATION_REPORTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được báo cáo tình hình đoàn" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ departureId: string }> }
) {
  try {
    const { departureId } = await context.params;
    const id = Number(departureId);
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID lịch khởi hành không hợp lệ" },
        { status: 400 }
      );
    }

    const reportStatus = String(body.reportStatus || "").trim();
    const currentLocation = String(body.currentLocation || "").trim();
    const content = String(body.content || "").trim();
    const presentCount = Number(body.presentCount || 0);
    const absentCount = Number(body.absentCount || 0);

    const issueType = body.issueType || null;
    const priorityLevel = body.priorityLevel || null;
    const handledAction = body.handledAction || null;
    const nextAction = body.nextAction || null;

    if (!reportStatus || !content) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập trạng thái và nội dung báo cáo" },
        { status: 400 }
      );
    }

    const created = await prisma.$queryRawUnsafe(`
      INSERT INTO operation_reports (
        departure_id,
        report_status,
        current_location,
        content,
        present_count,
        absent_count,

        issue_type,
        priority_level,
        handled_action,
        next_action,

        created_at
      )
      OUTPUT INSERTED.*
      VALUES (
        ${id},
        N'${reportStatus}',
        N'${currentLocation}',
        N'${content}',
        ${presentCount},
        ${absentCount},

        ${issueType ? `N'${issueType}'` : "NULL"},
        ${priorityLevel ? `N'${priorityLevel}'` : "NULL"},
        ${handledAction ? `N'${handledAction}'` : "NULL"},
        ${nextAction ? `N'${nextAction}'` : "NULL"},

        GETDATE()
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Gửi báo cáo tình hình đoàn thành công",
      data: serialize(created),
    });
  } catch (error) {
    console.error("CREATE_OPERATION_REPORT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không gửi được báo cáo tình hình đoàn" },
      { status: 500 }
    );
  }
}
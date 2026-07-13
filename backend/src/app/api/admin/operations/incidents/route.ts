import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function serialize(data: any) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

function makeIncidentCode() {
  return `IC${Date.now()}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword = escapeSql(searchParams.get("keyword") || "");
    const status = escapeSql(searchParams.get("status") || "");
    const priority = escapeSql(searchParams.get("priority") || "");

    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        oi.*,
        ds.departure_code,
        t.tour_name,
        t.tour_code
      FROM operation_incidents oi
      LEFT JOIN departure_schedules ds ON oi.departure_id = ds.id
      LEFT JOIN tours t ON ds.tour_id = t.id
      WHERE
        (
          '${keyword}' = ''
          OR oi.incident_code LIKE '%${keyword}%'
          OR oi.title LIKE N'%${keyword}%'
          OR t.tour_name LIKE N'%${keyword}%'
        )
        AND ('${status}' = '' OR oi.incident_status = '${status}')
        AND ('${priority}' = '' OR oi.priority_level = '${priority}')
      ORDER BY oi.reported_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(rows),
    });
  } catch (error) {
    console.error("GET_OPERATION_INCIDENTS_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách sự cố vận hành" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const departureId = body.departureId ? Number(body.departureId) : null;
    const incidentCode = String(body.incidentCode || makeIncidentCode()).trim();
    const incidentType = String(body.incidentType || "OTHER").trim();
    const priorityLevel = String(body.priorityLevel || "NORMAL").trim();
    const title = String(body.title || "").trim();
    const description = body.description ? String(body.description).trim() : null;
    const incidentStatus = String(body.incidentStatus || "OPEN").trim();
    const handledAction = body.handledAction
      ? String(body.handledAction).trim()
      : null;
    const createdBy = body.createdBy ? Number(body.createdBy) : null;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề sự cố" },
        { status: 400 }
      );
    }

    if (!departureId) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn lịch khởi hành" },
        { status: 400 }
      );
    }

    const created = await prisma.$queryRawUnsafe(`
      INSERT INTO operation_incidents (
        departure_id,
        incident_code,
        incident_type,
        priority_level,
        title,
        description,
        incident_status,
        handled_action,
        reported_at,
        resolved_at,
        created_by
      )
      OUTPUT INSERTED.*
      VALUES (
        ${departureId},
        '${escapeSql(incidentCode)}',
        '${escapeSql(incidentType)}',
        '${escapeSql(priorityLevel)}',
        N'${escapeSql(title)}',
        ${description ? `N'${escapeSql(description)}'` : "NULL"},
        '${escapeSql(incidentStatus)}',
        ${handledAction ? `N'${escapeSql(handledAction)}'` : "NULL"},
        GETDATE(),
        ${incidentStatus === "RESOLVED" ? "GETDATE()" : "NULL"},
        ${createdBy === null ? "NULL" : createdBy}
      )
    `);

    return NextResponse.json({
      success: true,
      message: "Tạo báo cáo sự cố thành công",
      data: serialize(created),
    });
  } catch (error) {
    console.error("CREATE_OPERATION_INCIDENT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không tạo được báo cáo sự cố" },
      { status: 500 }
    );
  }
}
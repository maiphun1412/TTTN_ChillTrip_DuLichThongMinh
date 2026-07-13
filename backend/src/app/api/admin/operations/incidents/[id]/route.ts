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

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const incidentId = Number(id);
    const body = await req.json();

    if (!incidentId) {
      return NextResponse.json(
        { success: false, message: "ID sự cố không hợp lệ" },
        { status: 400 }
      );
    }

    const incidentType = String(body.incidentType || "OTHER").trim();
    const priorityLevel = String(body.priorityLevel || "NORMAL").trim();
    const title = String(body.title || "").trim();
    const description = body.description ? String(body.description).trim() : null;
    const incidentStatus = String(body.incidentStatus || "OPEN").trim();
    const handledAction = body.handledAction
      ? String(body.handledAction).trim()
      : null;

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề sự cố" },
        { status: 400 }
      );
    }

    const updated = await prisma.$queryRawUnsafe(`
      UPDATE operation_incidents
      SET
        incident_type = '${escapeSql(incidentType)}',
        priority_level = '${escapeSql(priorityLevel)}',
        title = N'${escapeSql(title)}',
        description = ${description ? `N'${escapeSql(description)}'` : "NULL"},
        incident_status = '${escapeSql(incidentStatus)}',
        handled_action = ${handledAction ? `N'${escapeSql(handledAction)}'` : "NULL"},
        resolved_at = ${
          incidentStatus === "RESOLVED" || incidentStatus === "CLOSED"
            ? "ISNULL(resolved_at, GETDATE())"
            : "NULL"
        }
      OUTPUT INSERTED.*
      WHERE id = ${incidentId}
    `);

    return NextResponse.json({
      success: true,
      message: "Cập nhật sự cố thành công",
      data: serialize(updated),
    });
  } catch (error) {
    console.error("UPDATE_OPERATION_INCIDENT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không cập nhật được sự cố vận hành" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const incidentId = Number(id);

    if (!incidentId) {
      return NextResponse.json(
        { success: false, message: "ID sự cố không hợp lệ" },
        { status: 400 }
      );
    }

    await prisma.$queryRawUnsafe(`
      DELETE FROM operation_incidents
      WHERE id = ${incidentId}
    `);

    return NextResponse.json({
      success: true,
      message: "Xóa sự cố vận hành thành công",
    });
  } catch (error) {
    console.error("DELETE_OPERATION_INCIDENT_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không xóa được sự cố vận hành" },
      { status: 500 }
    );
  }
}
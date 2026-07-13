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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = escapeSql(searchParams.get("keyword") || "");

    const rows = await prisma.$queryRawUnsafe(`
      SELECT *
      FROM (
        SELECT
          vs.id,
          CONCAT('VEH-', vs.id) AS dispatch_code,
          'BUS' AS transport_type,
          NULL AS driver_name,
          NULL AS driver_phone,
          vs.vehicle_number AS vehicle_plate,
          vs.departure_time AS pickup_time,
          vs.pickup_location,
          vs.pickup_location AS current_location,
          vs.service_status AS dispatch_status,
          ds.departure_code,
          ds.start_date,
          ds.end_date,
          ds.booked_seats,
          t.tour_name,
          t.tour_code,
          s.supplier_name AS partner_name,
          s.supplier_type AS partner_type,
          s.phone AS partner_phone,
          vs.unit_price
        FROM vehicle_services vs
        LEFT JOIN departure_schedules ds ON vs.departure_id = ds.id
        LEFT JOIN tours t ON ds.tour_id = t.id
        LEFT JOIN suppliers s ON vs.supplier_id = s.id

        UNION ALL

        SELECT
          fs.id,
          CONCAT('FLT-', fs.id) AS dispatch_code,
          'FLIGHT' AS transport_type,
          NULL AS driver_name,
          NULL AS driver_phone,
          fs.flight_number AS vehicle_plate,
          fs.departure_time AS pickup_time,
          fs.departure_airport AS pickup_location,
          fs.arrival_airport AS current_location,
          fs.service_status AS dispatch_status,
          ds.departure_code,
          ds.start_date,
          ds.end_date,
          ds.booked_seats,
          t.tour_name,
          t.tour_code,
          ISNULL(s.supplier_name, fs.airline_name) AS partner_name,
          s.supplier_type AS partner_type,
          s.phone AS partner_phone,
          fs.unit_price
        FROM flight_services fs
        LEFT JOIN departure_schedules ds ON fs.departure_id = ds.id
        LEFT JOIN tours t ON ds.tour_id = t.id
        LEFT JOIN suppliers s ON fs.supplier_id = s.id

        UNION ALL

        SELECT
          hs.id,
          CONCAT('HTL-', hs.id) AS dispatch_code,
          'HOTEL' AS transport_type,
          NULL AS driver_name,
          NULL AS driver_phone,
          NULL AS vehicle_plate,
          CAST(hs.check_in_date AS DATETIME2) AS pickup_time,
          hs.address AS pickup_location,
          hs.hotel_name AS current_location,
          hs.service_status AS dispatch_status,
          ds.departure_code,
          ds.start_date,
          ds.end_date,
          ds.booked_seats,
          t.tour_name,
          t.tour_code,
          ISNULL(s.supplier_name, hs.hotel_name) AS partner_name,
          s.supplier_type AS partner_type,
          s.phone AS partner_phone,
          hs.unit_price
        FROM hotel_services hs
        LEFT JOIN departure_schedules ds ON hs.departure_id = ds.id
        LEFT JOIN tours t ON ds.tour_id = t.id
        LEFT JOIN suppliers s ON hs.supplier_id = s.id
      ) x
      WHERE
        '${keyword}' = ''
        OR x.dispatch_code LIKE '%${keyword}%'
        OR x.tour_name LIKE N'%${keyword}%'
        OR x.tour_code LIKE '%${keyword}%'
        OR x.partner_name LIKE N'%${keyword}%'
        OR x.vehicle_plate LIKE '%${keyword}%'
      ORDER BY x.pickup_time ASC
    `);

    return NextResponse.json({
      success: true,
      data: serialize(rows),
    });
  } catch (error) {
    console.error("GET_OPERATION_SERVICES_ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Không lấy được danh sách dịch vụ vận hành" },
      { status: 500 }
    );
  }
}
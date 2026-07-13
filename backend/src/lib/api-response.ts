export function ok<T>(data: T, message = "OK", status = 200) {
  return Response.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function fail(message: string, status = 400, errors?: unknown) {
  return Response.json(
    {
      success: false,
      message,
      errors: errors ?? null,
    },
    { status }
  );
}
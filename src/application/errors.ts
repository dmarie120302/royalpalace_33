import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function dbError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "42501")
    throw new AppError("No tienes permiso para realizar esta acción.", 403);
  if (error.code === "23503")
    throw new AppError(
      "Este registro tiene referencias activas. Revisa sus trabajos y pagos.",
      409,
    );
  if (error.code === "23505")
    throw new AppError("Ese registro ya existe.", 409);
  if (
    error.code === "23514" ||
    error.code === "P0001" ||
    error.code === "22023"
  )
    throw new AppError(error.message, 400);
  throw new AppError(
    "No se pudo completar la operación. Inténtalo de nuevo.",
    500,
  );
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Revisa los datos del formulario." },
      { status: 400 },
    );
  if (error instanceof AppError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error(
    "Application error",
    error instanceof Error ? error.message : "unknown",
  );
  return NextResponse.json(
    { error: "No se pudo completar la operación." },
    { status: 500 },
  );
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new AppError("Origen de solicitud inválido.", 403);
}

import { NextResponse } from "next/server";
import { uploadAttachment } from "@/application/attachments";
import {
  AppError,
  errorResponse,
  requireSameOrigin,
} from "@/application/errors";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const length = Number(request.headers.get("content-length"));
    if (length > 11534336)
      throw new AppError("El archivo supera el máximo de 10 MB.", 413);
    const id = await uploadAttachment(await request.formData());
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

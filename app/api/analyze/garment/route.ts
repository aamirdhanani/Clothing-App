import { NextResponse } from "next/server";
import { analyzeGarmentImage } from "@/lib/garment-analysis";
import { getUserFromAuthHeader } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Please sign in to use analysis." }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "A garment image is required." }, { status: 400 });
    }

    const analysis = await analyzeGarmentImage(image);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to analyze garment image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

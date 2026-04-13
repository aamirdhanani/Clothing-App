import { NextResponse } from "next/server";
import { analyzeTagImage } from "@/lib/garment-analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "A tag image is required." }, { status: 400 });
    }

    const analysis = await analyzeTagImage(image);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze tag image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getGarments, saveGarmentFromFormData } from "@/lib/garments";
import { getUserFromAuthHeader } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const garments = await getGarments(user.id);
    return NextResponse.json({ garments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load garments.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const formData = await request.formData();
    formData.set("userId", user.id);
    const result = await saveGarmentFromFormData(formData);
    return NextResponse.json(result, { status: result.saved ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save garment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

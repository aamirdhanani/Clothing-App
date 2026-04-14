import { NextResponse } from "next/server";
import { deleteGarment, setGarmentLastWorn } from "@/lib/garments";
import { getUserFromAuthHeader } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { id } = await context.params;
    const payload = (await request.json().catch(() => ({}))) as { action?: string };

    if (payload.action !== "just_worn") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const garment = await setGarmentLastWorn(user.id, id);
    return NextResponse.json({ garment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update garment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get("authorization"));
    if (!user) {
      return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
    }

    const { id } = await context.params;
    await deleteGarment(user.id, id);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete garment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

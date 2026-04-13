import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseConfig } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { ok: false, connected: false, error: "Supabase env vars are missing." },
      { status: 200 },
    );
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, connected: false, error: "Supabase admin client is unavailable." },
      { status: 200 },
    );
  }

  const { error: garmentsError } = await client
    .from("garments")
    .select("id")
    .limit(1);

  if (garmentsError) {
    return NextResponse.json(
      { ok: false, connected: false, error: garmentsError.message },
      { status: 200 },
    );
  }

  const { error: profilesError } = await client
    .from("profiles")
    .select("id")
    .limit(1);

  if (profilesError) {
    return NextResponse.json(
      { ok: false, connected: false, error: profilesError.message },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, connected: true });
}

import { NextResponse } from "next/server";
import { getSupabaseAdminClient, hasSupabaseConfig } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const STORAGE_BUCKETS = ["garment-images", "garment-tags"] as const;

async function checkWritableBucket(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  bucket: string,
) {
  const filename = `health/${crypto.randomUUID()}.png`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2b9mQAAAAASUVORK5CYII=",
    "base64",
  );

  const uploadResult = await client.storage.from(bucket).upload(filename, png, {
    contentType: "image/png",
    upsert: true,
  });

  if (uploadResult.error) {
    return { bucket, ok: false, error: uploadResult.error.message };
  }

  const removeResult = await client.storage.from(bucket).remove([filename]);
  if (removeResult.error) {
    return { bucket, ok: false, error: removeResult.error.message };
  }

  return { bucket, ok: true };
}

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

  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  if (bucketError) {
    return NextResponse.json(
      { ok: false, connected: false, error: bucketError.message },
      { status: 200 },
    );
  }

  const missingBuckets = STORAGE_BUCKETS.filter(
    (bucket) => !buckets?.some((entry) => entry.name === bucket),
  );
  if (missingBuckets.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: `Missing storage buckets: ${missingBuckets.join(", ")}`,
      },
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

  const writableBuckets: Array<{ bucket: string; ok: boolean; error?: string }> = [];
  for (const bucket of STORAGE_BUCKETS) {
    // Use a tiny upload/remove cycle so we know Storage is actually writable.
    // The object is deleted immediately after the check.
    // eslint-disable-next-line no-await-in-loop
    writableBuckets.push(await checkWritableBucket(client, bucket));
  }

  const failedBucket = writableBuckets.find((entry) => !entry.ok);
  if (failedBucket) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: `Storage check failed for ${failedBucket.bucket}: ${failedBucket.error}`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    connected: true,
    buckets: writableBuckets,
    warning:
      "Profiles is not required for the app health check. If you want Supabase to refresh its schema cache, run NOTIFY pgrst, 'reload schema'; in the SQL editor.",
  });
}

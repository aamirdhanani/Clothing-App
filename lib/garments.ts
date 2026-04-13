import { demoGarments } from "@/lib/demo-data";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { GarmentPayload, GarmentRecord } from "@/lib/types";

const GARMENTS_BUCKET = "garment-images";
const TAGS_BUCKET = "garment-tags";

function toArray(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeString(value: FormDataEntryValue | unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function mapRecord(row: Record<string, unknown>): GarmentRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    category: String(row.category ?? ""),
    brand: normalizeString(row.brand as FormDataEntryValue),
    size: normalizeString(row.size as FormDataEntryValue),
    primary_color: String(row.primary_color ?? ""),
    secondary_colors: Array.isArray(row.secondary_colors)
      ? row.secondary_colors.map(String)
      : [],
    pattern: normalizeString(row.pattern as FormDataEntryValue),
    style_tags: Array.isArray(row.style_tags) ? row.style_tags.map(String) : [],
    season: Array.isArray(row.season) ? row.season.map(String) : [],
    occasion: Array.isArray(row.occasion) ? row.occasion.map(String) : [],
    fit: normalizeString(row.fit as FormDataEntryValue),
    material_composition: Array.isArray(row.material_composition)
      ? row.material_composition.map((entry) => ({
          material: String((entry as { material?: unknown }).material ?? ""),
          percentage:
            typeof (entry as { percentage?: unknown }).percentage === "number"
              ? Number((entry as { percentage?: number }).percentage)
              : null,
        }))
      : [],
    care_instructions: Array.isArray(row.care_instructions)
      ? row.care_instructions.map(String)
      : [],
    confidence: typeof row.confidence === "number" ? row.confidence : 0.5,
    image_url: String(row.image_url ?? ""),
    tag_image_url: normalizeString(row.tag_image_url as FormDataEntryValue),
    notes: normalizeString(row.notes as FormDataEntryValue),
    created_at: String(row.created_at ?? new Date().toISOString()),
    last_worn_at: normalizeString(row.last_worn_at as FormDataEntryValue),
  };
}

export async function getGarments(userId?: string): Promise<GarmentRecord[]> {
  const client = getSupabaseAdminClient();

  if (!client) {
    return demoGarments;
  }

  let query = client.from("garments").select("*").order("created_at", { ascending: false });
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRecord(row as Record<string, unknown>));
}

async function uploadFile(
  client: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  bucket: string,
  file: File,
  userId: string,
  prefix: string,
) {
  const extension = file.name.split(".").pop() || "jpg";
  const filename = `${userId}/${prefix}-${crypto.randomUUID()}.${extension}`;
  const result = await client.storage.from(bucket).upload(filename, file, {
    contentType: file.type,
    upsert: true,
  });

  if (result.error) {
    throw result.error;
  }

  const { data } = client.storage.from(bucket).getPublicUrl(result.data.path);
  return data.publicUrl;
}

export async function saveGarmentFromFormData(formData: FormData) {
  const client = getSupabaseAdminClient();
  const fallbackPayload = {
    saved: false,
    garment: null,
    message:
      "Supabase is not configured yet, so the app returned a preview-only garment.",
  };

  if (!client) {
    return fallbackPayload;
  }

  const garmentImage = formData.get("garmentImage");
  const tagImage = formData.get("tagImage");
  const analysis = formData.get("analysis");
  const tagAnalysis = formData.get("tagAnalysis");

  const manual = {
    name: normalizeString(formData.get("name")),
    category: normalizeString(formData.get("category")),
    brand: normalizeString(formData.get("brand")),
    size: normalizeString(formData.get("size")),
    primaryColor: normalizeString(formData.get("primaryColor")),
    secondaryColors: toArray(formData.get("secondaryColors")),
    pattern: normalizeString(formData.get("pattern")),
    styleTags: toArray(formData.get("styleTags")),
    season: toArray(formData.get("season")),
    occasion: toArray(formData.get("occasion")),
    fit: normalizeString(formData.get("fit")),
    notes: normalizeString(formData.get("notes")),
    lastWornAt: normalizeString(formData.get("lastWornAt")),
    careInstructions: toArray(formData.get("careInstructions")),
    materials: toArray(formData.get("materials")),
  };

  const parsedAnalysis =
    typeof analysis === "string" && analysis.length > 0
      ? (JSON.parse(analysis) as Record<string, unknown>)
      : {};
  const parsedTagAnalysis =
    typeof tagAnalysis === "string" && tagAnalysis.length > 0
      ? (JSON.parse(tagAnalysis) as Record<string, unknown>)
      : {};

  const userIdEntry = formData.get("userId");
  const userId =
    typeof userIdEntry === "string" && userIdEntry.length > 0 ? userIdEntry : "guest";

  let garmentImageUrl = normalizeString(formData.get("imageUrl"));
  let tagImageUrl = normalizeString(formData.get("tagImageUrl"));

  if (garmentImage instanceof File && garmentImage.size > 0) {
    garmentImageUrl = await uploadFile(
      client,
      GARMENTS_BUCKET,
      garmentImage,
      userId,
      "garment",
    );
  }

  if (tagImage instanceof File && tagImage.size > 0) {
    tagImageUrl = await uploadFile(client, TAGS_BUCKET, tagImage, userId, "tag");
  }

  const garmentRow: GarmentPayload = {
    name:
      manual.name ??
      normalizeString(parsedAnalysis.garmentType as FormDataEntryValue) ??
      "Untitled garment",
    category:
      manual.category ??
      normalizeString(parsedAnalysis.garmentType as FormDataEntryValue) ??
      "Other",
    brand: manual.brand ?? normalizeString(parsedAnalysis.brandGuess as FormDataEntryValue),
    size: manual.size ?? normalizeString(parsedTagAnalysis.size as FormDataEntryValue),
    primary_color:
      manual.primaryColor ??
      normalizeString(parsedAnalysis.primaryColor as FormDataEntryValue) ??
      "Unknown",
    secondary_colors: manual.secondaryColors,
    pattern: manual.pattern ?? normalizeString(parsedAnalysis.pattern as FormDataEntryValue),
    style_tags: manual.styleTags,
    season: manual.season,
    occasion: manual.occasion,
    fit: manual.fit ?? normalizeString(parsedAnalysis.fit as FormDataEntryValue),
    material_composition:
      manual.materials.length > 0
        ? manual.materials.map((entry) => ({
            material: String((entry as { material?: unknown }).material ?? ""),
            percentage:
              typeof (entry as { percentage?: unknown }).percentage === "number"
                ? Number((entry as { percentage?: number }).percentage)
                : null,
          }))
        : Array.isArray(parsedTagAnalysis.materials)
          ? (parsedTagAnalysis.materials as Array<{
              material: string;
              percentage?: number | null;
            }>).map((entry) => ({
              material: entry.material,
              percentage:
                typeof entry.percentage === "number" ? entry.percentage : null,
            }))
          : [],
    care_instructions:
      manual.careInstructions.length > 0
        ? manual.careInstructions
        : Array.isArray(parsedTagAnalysis.careInstructions)
          ? (parsedTagAnalysis.careInstructions as string[])
          : [],
    confidence: Math.max(
      Number(parsedAnalysis.confidence ?? 0.6),
      Number(parsedTagAnalysis.confidence ?? 0.6),
    ),
    image_url: garmentImageUrl ?? "",
    tag_image_url: tagImageUrl,
    notes:
      manual.notes ??
      normalizeString(parsedAnalysis.notes as FormDataEntryValue) ??
      "Captured with the closet intake workflow.",
    last_worn_at: manual.lastWornAt,
  };

  const { data, error } = await client
    .from("garments")
    .insert({
      user_id: userId,
      name: garmentRow.name,
      category: garmentRow.category,
      brand: garmentRow.brand,
      size: garmentRow.size,
      primary_color: garmentRow.primary_color,
      secondary_colors: garmentRow.secondary_colors,
      pattern: garmentRow.pattern,
      style_tags: garmentRow.style_tags,
      season: garmentRow.season,
      occasion: garmentRow.occasion,
      fit: garmentRow.fit,
      material_composition: garmentRow.material_composition,
      care_instructions: garmentRow.care_instructions,
      confidence: garmentRow.confidence,
      image_url: garmentRow.image_url,
      tag_image_url: garmentRow.tag_image_url,
      notes: garmentRow.notes,
      last_worn_at: garmentRow.last_worn_at,
      ai_analysis: {
        garment: parsedAnalysis,
        tag: parsedTagAnalysis,
      },
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    saved: true,
    garment: mapRecord(data as Record<string, unknown>),
    message: "Garment saved successfully.",
  };
}

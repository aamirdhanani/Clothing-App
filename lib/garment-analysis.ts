import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { GarmentAnalysis, TagAnalysis } from "@/lib/types";

const garmentAnalysisSchema = z.object({
  garmentType: z.string(),
  brandGuess: z.string().nullable(),
  primaryColor: z.string(),
  secondaryColors: z.array(z.string()).default([]),
  pattern: z.string().nullable(),
  styleTags: z.array(z.string()).default([]),
  season: z.array(z.string()).default([]),
  occasion: z.array(z.string()).default([]),
  fit: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  notes: z.string().nullable(),
});

const tagAnalysisSchema = z.object({
  rawText: z.string(),
  materials: z
    .array(
      z.object({
        material: z.string(),
        percentage: z.number().min(0).max(100).nullable(),
      }),
    )
    .default([]),
  careInstructions: z.array(z.string()).default([]),
  countryOfOrigin: z.string().nullable(),
  size: z.string().nullable(),
  brand: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

async function toDataUrl(file: File) {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export async function analyzeGarmentImage(file: File): Promise<GarmentAnalysis> {
  const client = getClient();
  const imageUrl = await toDataUrl(file);

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content:
          "You are a fashion cataloging assistant. Return only structured data for a garment photo.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Identify the garment and return a concise catalog record. Prefer practical wardrobe labels over abstract style language.",
          },
          { type: "input_image", image_url: imageUrl, detail: "auto" },
        ],
      },
    ],
    text: {
      format: zodTextFormat(garmentAnalysisSchema, "garment_analysis"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Unable to parse garment analysis response.");
  }

  return response.output_parsed;
}

export async function analyzeTagImage(file: File): Promise<TagAnalysis> {
  const client = getClient();
  const imageUrl = await toDataUrl(file);

  const response = await client.responses.parse({
    model,
    input: [
      {
        role: "system",
        content:
          "You read garment care labels and composition tags. Extract text and structure materials when shown.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Read the tag image. Return raw label text, the material blend with percentages when available, brand if shown, size if shown, country of origin if shown, and care instructions.",
          },
          { type: "input_image", image_url: imageUrl, detail: "auto" },
        ],
      },
    ],
    text: {
      format: zodTextFormat(tagAnalysisSchema, "tag_analysis"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("Unable to parse tag analysis response.");
  }

  return response.output_parsed;
}

export type MaterialBlend = {
  material: string;
  percentage: number | null;
};

export type GarmentAnalysis = {
  garmentType: string;
  brandGuess: string | null;
  primaryColor: string;
  secondaryColors: string[];
  pattern: string | null;
  styleTags: string[];
  season: string[];
  occasion: string[];
  fit: string | null;
  confidence: number;
  notes: string | null;
};

export type TagAnalysis = {
  rawText: string;
  materials: MaterialBlend[];
  careInstructions: string[];
  countryOfOrigin: string | null;
  size: string | null;
  brand: string | null;
  confidence: number;
};

export type GarmentRecord = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  size: string | null;
  primary_color: string;
  secondary_colors: string[];
  pattern: string | null;
  style_tags: string[];
  season: string[];
  occasion: string[];
  fit: string | null;
  material_composition: MaterialBlend[];
  care_instructions: string[];
  confidence: number;
  image_url: string;
  tag_image_url: string | null;
  notes: string | null;
  created_at: string;
  last_worn_at: string | null;
};

export type GarmentPayload = Omit<GarmentRecord, "id" | "created_at"> & {
  ai_analysis?: Record<string, unknown>;
};

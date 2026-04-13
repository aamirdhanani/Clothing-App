"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { GarmentAnalysis, MaterialBlend, TagAnalysis } from "@/lib/types";

type MaterialRow = MaterialBlend;

const seasons = ["spring", "summer", "fall", "winter"];

function toCommaList(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function usePreview(file: File | null) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return preview;
}

const defaultMaterialRow = (): MaterialRow => ({ material: "", percentage: null });

export function GarmentIntakeForm() {
  const router = useRouter();
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const garmentInput = useRef<HTMLInputElement | null>(null);
  const tagInput = useRef<HTMLInputElement | null>(null);

  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [tagFile, setTagFile] = useState<File | null>(null);
  const garmentPreview = usePreview(garmentFile);
  const tagPreview = usePreview(tagFile);

  const [analysis, setAnalysis] = useState<GarmentAnalysis | null>(null);
  const [tagAnalysis, setTagAnalysis] = useState<TagAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState<null | "garment" | "tag">(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [savePhase, setSavePhase] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColors, setSecondaryColors] = useState("");
  const [pattern, setPattern] = useState("");
  const [fit, setFit] = useState("");
  const [styleTags, setStyleTags] = useState("");
  const [occasion, setOccasion] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [lastWornAt, setLastWornAt] = useState("");
  const [activeSeason, setActiveSeason] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([defaultMaterialRow()]);

  function syncAnalysis(next: GarmentAnalysis) {
    setAnalysis(next);
    setName((current) => current || next.garmentType);
    setCategory((current) => current || next.garmentType);
    setPrimaryColor((current) => current || next.primaryColor);
    setSecondaryColors((current) => current || toCommaList(next.secondaryColors));
    setPattern((current) => current || (next.pattern ?? ""));
    setStyleTags((current) => current || toCommaList(next.styleTags));
    setOccasion((current) => current || toCommaList(next.occasion));
    setFit((current) => current || (next.fit ?? ""));
    setNotes((current) => current || (next.notes ?? ""));
    setActiveSeason((current) => (current.length ? current : next.season));
  }

  function syncTagAnalysis(next: TagAnalysis) {
    setTagAnalysis(next);
    setBrand((current) => current || (next.brand ?? ""));
    setSize((current) => current || (next.size ?? ""));
    setCareInstructions((current) => (current ? current : next.careInstructions.join(", ")));
    if (next.materials.length > 0) {
      setMaterials(next.materials);
    }
  }

  async function analyze(kind: "garment" | "tag") {
    const file = kind === "garment" ? garmentFile : tagFile;
    if (!file) {
      setError(true);
      setMessage(kind === "garment" ? "Add a garment photo first." : "Add a label photo first.");
      return;
    }

    setLoadingAnalysis(kind);
    setError(false);
    setMessage("");

    const endpoint = kind === "garment" ? "/api/analyze/garment" : "/api/analyze/tag";
    const formData = new FormData();
    formData.append("image", file);
    const { data } = client ? await client.auth.getSession() : { data: { session: null } };

    if (!data.session?.access_token) {
      setError(true);
      setMessage("Please sign in to use photo analysis.");
      setLoadingAnalysis(null);
      return;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: formData,
    });

    const payload = (await response.json()) as
      | { error?: string; analysis?: GarmentAnalysis | TagAnalysis }
      | GarmentAnalysis
      | TagAnalysis;

    if (!response.ok) {
      const fallback = (payload as { error?: string }).error || "Unable to read that photo.";
      setError(true);
      setMessage(fallback);
      setLoadingAnalysis(null);
      return;
    }

    const nextAnalysis = "analysis" in payload ? payload.analysis : payload;

    if (kind === "garment") {
      syncAnalysis(nextAnalysis as GarmentAnalysis);
    } else {
      syncTagAnalysis(nextAnalysis as TagAnalysis);
    }

    setMessage(kind === "garment" ? "Garment photo read." : "Label read.");
    setLoadingAnalysis(null);
  }

  function toggleSeason(season: string) {
    setActiveSeason((current) =>
      current.includes(season)
        ? current.filter((entry) => entry !== season)
        : [...current, season],
    );
  }

  function addMaterialRow() {
    setMaterials((current) => [...current, defaultMaterialRow()]);
  }

  function updateMaterialRow(index: number, key: keyof MaterialRow, value: string) {
    setMaterials((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: key === "percentage" ? (value ? Number(value) : null) : value,
            }
          : row,
      ),
    );
  }

  function removeMaterialRow(index: number) {
    setMaterials((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(false);
    setMessage("");
    setSaveProgress(0);
    setSavePhase("Preparing upload...");

    const formData = new FormData();
    if (garmentFile) {
      formData.append("garmentImage", garmentFile);
    }
    if (tagFile) {
      formData.append("tagImage", tagFile);
    }
    formData.append("name", name);
    formData.append("category", category);
    formData.append("brand", brand);
    formData.append("size", size);
    formData.append("primaryColor", primaryColor);
    formData.append("secondaryColors", JSON.stringify(parseCommaList(secondaryColors)));
    formData.append("pattern", pattern);
    formData.append("styleTags", JSON.stringify(parseCommaList(styleTags)));
    formData.append("season", JSON.stringify(activeSeason));
    formData.append("occasion", JSON.stringify(parseCommaList(occasion)));
    formData.append("fit", fit);
    formData.append("notes", notes);
    formData.append("lastWornAt", lastWornAt);
    formData.append("careInstructions", JSON.stringify(parseCommaList(careInstructions)));
    formData.append("materials", JSON.stringify(materials));
    formData.append("analysis", JSON.stringify(analysis ?? {}));
    formData.append("tagAnalysis", JSON.stringify(tagAnalysis ?? {}));

    const { data } = client ? await client.auth.getSession() : { data: { session: null } };
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/garments");
        xhr.responseType = "json";
        xhr.withCredentials = true;

        if (data.session?.access_token) {
          xhr.setRequestHeader("Authorization", `Bearer ${data.session.access_token}`);
        }

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            setSavePhase("Uploading photos...");
            return;
          }

          const percent = Math.max(1, Math.min(95, Math.round((event.loaded / event.total) * 100)));
          setSaveProgress(percent);
          setSavePhase(percent < 70 ? "Uploading photos..." : "Saving garment...");
        };

        xhr.onerror = () => reject(new Error("Unable to reach the server."));
        xhr.onabort = () => reject(new DOMException("The request was aborted.", "AbortError"));
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            resolve(
              new Response(JSON.stringify(xhr.response ?? {}), {
                status: xhr.status,
                headers: { "content-type": "application/json" },
              }),
            );
          }
        };

        controller.signal.addEventListener("abort", () => xhr.abort(), { once: true });
        xhr.send(formData);
      });

      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(true);
        setMessage(payload.error || "Please sign in to save this piece.");
        return;
      }

      setSaveProgress(100);
      setSavePhase("Done.");
      setMessage(payload.message || "Garment saved.");
      router.push("/closet");
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof DOMException && submitError.name === "AbortError"
          ? "Saving took too long. Please try again."
          : submitError instanceof Error
            ? submitError.message
            : "Unable to save this piece.";
      setError(true);
      setMessage(message);
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
      setTimeout(() => {
        setSaveProgress(0);
        setSavePhase("");
      }, 1500);
    }
  }

  return (
    <form className="stack reveal" onSubmit={handleSubmit}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Add garment</div>
          <h1 className="section-title display" style={{ marginTop: 8 }}>
            Add a piece to your private closet.
          </h1>
          <p className="section-copy">
            Capture the garment, read the label, and save the details you want to keep.
          </p>
        </div>
      </div>

      <div className="upload-layout">
        <div className="stack">
          <div className="panel dropzone">
            {garmentPreview ? (
              <div className="preview-frame">
                <img src={garmentPreview} alt="Garment preview" className="preview-image" />
                <div className="preview-overlay">
                  <span>Garment image</span>
                  <button
                    type="button"
                    className="preview-action"
                    onClick={() => garmentInput.current?.click()}
                  >
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="eyebrow">Photo</div>
                <h2 className="display" style={{ margin: 0 }}>
                  Garment image
                </h2>
                <p className="help-text">Use a clean photo with the shape of the piece clearly visible.</p>
              </>
            )}
            <input
              ref={garmentInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => setGarmentFile(event.target.files?.[0] ?? null)}
            />
            <div className="split">
              <button type="button" className="button button-secondary" onClick={() => garmentInput.current?.click()}>
                Choose photo
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => analyze("garment")}
                disabled={loadingAnalysis === "garment"}
              >
                {loadingAnalysis === "garment" ? (
                  <span className="button-loading">
                    <span className="spinner" />
                    Reading...
                  </span>
                ) : (
                  "Read photo"
                )}
              </button>
            </div>
          </div>

          <div className="panel dropzone">
            {tagPreview ? (
              <div className="preview-frame">
                <img src={tagPreview} alt="Label preview" className="preview-image" />
                <div className="preview-overlay">
                  <span>Label image</span>
                  <button type="button" className="preview-action" onClick={() => tagInput.current?.click()}>
                    Replace
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="eyebrow">Label</div>
                <h2 className="display" style={{ margin: 0 }}>
                  Care label
                </h2>
                <p className="help-text">Capture the label so materials, origin, and care details are stored.</p>
              </>
            )}
            <input
              ref={tagInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => setTagFile(event.target.files?.[0] ?? null)}
            />
            <div className="split">
              <button type="button" className="button button-secondary" onClick={() => tagInput.current?.click()}>
                Choose label
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={() => analyze("tag")}
                disabled={loadingAnalysis === "tag"}
              >
                {loadingAnalysis === "tag" ? (
                  <span className="button-loading">
                    <span className="spinner" />
                    Reading...
                  </span>
                ) : (
                  "Read label"
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="form-section-title">Details</div>
          <div className="form-grid">
            <label className="field span-2">
              <span className="label">Name</span>
              <input
                className="input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Navy wool coat"
              />
            </label>

            <label className="field">
              <span className="label">Category</span>
              <input className="input" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Outerwear" />
            </label>

            <label className="field">
              <span className="label">Brand</span>
              <input className="input" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Theory" />
            </label>

            <label className="field">
              <span className="label">Size</span>
              <input className="input" value={size} onChange={(event) => setSize(event.target.value)} placeholder="M" />
            </label>

            <label className="field">
              <span className="label">Primary color</span>
              <input className="input" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} placeholder="Navy" />
            </label>

            <label className="field span-2">
              <span className="label">Secondary colors</span>
              <input
                className="input"
                value={secondaryColors}
                onChange={(event) => setSecondaryColors(event.target.value)}
                placeholder="Charcoal, gold"
              />
            </label>

            <label className="field">
              <span className="label">Pattern</span>
              <input className="input" value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="Solid" />
            </label>

            <label className="field">
              <span className="label">Fit</span>
              <input className="input" value={fit} onChange={(event) => setFit(event.target.value)} placeholder="Relaxed" />
            </label>

            <label className="field span-2">
              <span className="label">Descriptors</span>
              <input
                className="input"
                value={styleTags}
                onChange={(event) => setStyleTags(event.target.value)}
                placeholder="minimal, tailored, winter"
              />
            </label>

            <label className="field span-2">
              <span className="label">Occasions</span>
              <input
                className="input"
                value={occasion}
                onChange={(event) => setOccasion(event.target.value)}
                placeholder="Work, formal, weekend"
              />
            </label>

            <label className="field span-2">
              <span className="label">Care notes</span>
              <input
                className="input"
                value={careInstructions}
                onChange={(event) => setCareInstructions(event.target.value)}
                placeholder="Dry clean only, line dry"
              />
            </label>

            <label className="field span-2">
              <span className="label">Notes</span>
              <textarea
                className="textarea"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Fit notes, styling ideas, or anything you want to remember."
              />
            </label>

            <label className="field">
              <span className="label">Last worn</span>
              <input className="input" type="date" value={lastWornAt} onChange={(event) => setLastWornAt(event.target.value)} />
            </label>

            <label className="field">
              <span className="label">Season</span>
              <select
                className="select"
                value={activeSeason[0] ?? ""}
                onChange={(event) => setActiveSeason(event.target.value ? [event.target.value] : [])}
              >
                <option value="">Select season</option>
                {seasons.map((season) => (
                  <option key={season} value={season}>
                    {season}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="divider" />

          <div className="materials">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div>
                <div className="eyebrow">Composition</div>
                <h2 className="section-title" style={{ fontSize: "1.4rem" }}>
                  Materials and percentages
                </h2>
              </div>
              <button type="button" className="button button-secondary" onClick={addMaterialRow}>
                Add material
              </button>
            </div>

            {materials.map((row, index) => (
              <div key={`${index}-${row.material}`} className="material-row">
                <input
                  className="input"
                  value={row.material}
                  onChange={(event) => updateMaterialRow(index, "material", event.target.value)}
                  placeholder="Wool"
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={row.percentage ?? ""}
                  onChange={(event) => updateMaterialRow(index, "percentage", event.target.value)}
                  placeholder="%"
                />
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => removeMaterialRow(index)}
                  disabled={materials.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={`message ${error ? "error" : "success"}`}>{message}</div>

          {saving ? (
            <div className="upload-status" aria-live="polite">
              <div className="upload-status-row">
                <span>{savePhase || "Saving..."}</span>
                <span>{saveProgress}%</span>
              </div>
              <div className="upload-progress">
                <div className="upload-progress-bar" style={{ width: `${Math.max(saveProgress, 8)}%` }} />
              </div>
            </div>
          ) : null}

          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => router.push("/closet")}>
              Back to closet
            </button>
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save piece"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

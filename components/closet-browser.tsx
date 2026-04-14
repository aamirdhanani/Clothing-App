"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { GarmentRecord } from "@/lib/types";

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

export function ClosetBrowser({
  garments,
  onDelete,
  onJustWorn,
}: {
  garments: GarmentRecord[];
  onDelete: (id: string) => Promise<void> | void;
  onJustWorn: (id: string) => Promise<void> | void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [color, setColor] = useState("all");
  const [selectedId, setSelectedId] = useState(garments[0]?.id ?? "");

  useEffect(() => {
    if (!garments.length) {
      setSelectedId("");
      return;
    }

    if (!garments.some((item) => item.id === selectedId)) {
      setSelectedId(garments[0].id);
    }
  }, [garments, selectedId]);

  const types = unique(garments.map((item) => item.category));
  const colors = unique(garments.map((item) => item.primary_color));

  const filtered = useMemo(() => {
    return garments.filter((item) => {
      const haystack = [item.name, item.brand, item.category, item.primary_color].join(" ").toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesType = type === "all" || item.category === type;
      const matchesColor = color === "all" || item.primary_color === color;
      return matchesQuery && matchesType && matchesColor;
    });
  }, [garments, query, type, color]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  async function handleJustWorn() {
    if (!selected) return;
    await onJustWorn(selected.id);
  }

  async function handleDelete() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete ${selected.name}? This cannot be undone.`);
    if (!confirmed) return;
    await onDelete(selected.id);
  }

  return (
    <div className="closet-shell reveal">
      <div className="page-head clean-head">
        <div>
          <div className="eyebrow">Wardrobe</div>
          <h1 className="section-title display" style={{ marginTop: 8 }}>
            Your collection
          </h1>
          <p className="section-copy">Search and open each piece in your private archive.</p>
        </div>
        <div className="split">
          <Link href="/garments/new" className="button button-primary">
            Add garment
          </Link>
        </div>
      </div>

      <div className="toolbar clean-toolbar">
        <label className="field">
          <span className="label">Search</span>
          <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search garments" />
        </label>

        <label className="field">
          <span className="label">Category</span>
          <select className="select" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All</option>
            {types.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="label">Color</span>
          <select className="select" value={color} onChange={(event) => setColor(event.target.value)}>
            <option value="all">All</option>
            {colors.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="page-layout closet-layout">
        <section className="closet-grid">
          {filtered.map((item) => (
            <article key={item.id} className={`garment-card ${item.id === selected?.id ? "active" : ""}`} onClick={() => setSelectedId(item.id)}>
              <div className="garment-media">
                <img src={item.image_url} alt={item.name} />
              </div>
              <div className="garment-body">
                <h2 className="garment-title">{item.name}</h2>
                <div className="garment-meta">
                  <span>{item.brand ?? "Unbranded"}</span>
                  <span>{item.primary_color}</span>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 ? <div className="empty-state">No garments match these filters.</div> : null}
        </section>

        <aside className="detail-card">
          {selected ? (
            <>
              <div className="detail-figure">
                <img src={selected.image_url} alt={selected.name} />
              </div>
              <div className="detail-stack">
                <div>
                  <div className="eyebrow">Selected piece</div>
                  <h2 className="section-title" style={{ fontSize: "1.8rem", marginTop: 6 }}>{selected.name}</h2>
                  <p className="help-text">{selected.brand ?? "Unbranded"} · {selected.category}</p>
                </div>

                <div className="detail-grid">
                  <div className="detail-row"><div className="detail-key">Color</div><div className="detail-value">{selected.primary_color}</div></div>
                  <div className="detail-row"><div className="detail-key">Material</div><div className="detail-value">{selected.material_composition.map((entry) => `${entry.material}${entry.percentage ? ` ${entry.percentage}%` : ""}`).join(", ")}</div></div>
                  <div className="detail-row"><div className="detail-key">Care</div><div className="detail-value">{selected.care_instructions.join(", ")}</div></div>
                  <div className="detail-row"><div className="detail-key">Last worn</div><div className="detail-value">{selected.last_worn_at ? new Date(selected.last_worn_at).toLocaleDateString() : "Never"}</div></div>
                </div>

                <div className="detail-actions">
                  <button type="button" className="button button-secondary detail-action" onClick={handleJustWorn}>
                    Just worn
                  </button>
                  <button type="button" className="button button-ghost detail-action danger" onClick={handleDelete}>
                    Delete
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">Select a piece to see its details.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

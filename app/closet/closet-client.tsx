"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ClosetBrowser } from "@/components/closet-browser";
import type { GarmentRecord } from "@/lib/types";

export function ClosetClient() {
  const router = useRouter();
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [garments, setGarments] = useState<GarmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!client) {
        router.replace("/login");
        return;
      }

      const { data } = await client.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/garments", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "We could not load your closet yet.");
        setLoading(false);
        return;
      }

      setGarments(payload.garments ?? []);
      setLoading(false);
    }

    void load();
  }, [client, router]);

  async function getAccessToken() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function handleJustWorn(id: string) {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const response = await fetch(`/api/garments/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "just_worn" }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "We could not update that garment.");
      return;
    }

    const payload = await response.json();
    if (payload.garment) {
      setGarments((current) =>
        current.map((item) => (item.id === id ? payload.garment : item)),
      );
    }
  }

  async function handleDelete(id: string) {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const response = await fetch(`/api/garments/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error || "We could not delete that garment.");
      return;
    }

    setGarments((current) => current.filter((item) => item.id !== id));
  }

  if (loading) {
    return <div className="panel">Loading your closet...</div>;
  }

  if (error) {
    return <div className="panel">{error}</div>;
  }

  return <ClosetBrowser garments={garments} onDelete={handleDelete} onJustWorn={handleJustWorn} />;
}

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

  if (loading) {
    return <div className="panel">Loading your closet...</div>;
  }

  if (error) {
    return <div className="panel">{error}</div>;
  }

  return <ClosetBrowser garments={garments} />;
}

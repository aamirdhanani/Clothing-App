"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { GarmentIntakeForm } from "@/components/garment-intake-form";

export function GarmentClient() {
  const router = useRouter();
  const client = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    async function guard() {
      if (!client) {
        router.replace("/login");
        return;
      }

      const { data } = await client.auth.getSession();
      if (!data.session) {
        router.replace("/login");
      }
    }

    void guard();
  }, [client, router]);

  return <GarmentIntakeForm />;
}

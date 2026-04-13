"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const appLinks = [
  { href: "/closet", label: "Closet" },
  { href: "/garments/new", label: "Add garment" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function syncSession() {
      if (!client) {
        if (active) setLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    }

    void syncSession();

    if (!client) {
      return () => {
        active = false;
      };
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    setSession(null);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="site-nav">
      <div className="nav-panel">
        <Link href={session ? "/closet" : "/"} className="brand" aria-label="Closet Atlas home">
          <span className="brand-mark">
            <span className="brand-mark-ring" />
            <span className="brand-mark-letter">C</span>
          </span>
          <span className="brand-wordmark">Closet Atlas</span>
        </Link>

        <div className="nav-center">
          {!loading && session ? (
            <nav className="nav-links" aria-label="Primary">
              {appLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${pathname === link.href ? "active" : ""}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="nav-actions">
          {loading ? null : session ? (
            <>
              <span className="avatar-placeholder" aria-hidden="true">
                {session.user.email?.[0]?.toUpperCase() ?? "A"}
              </span>
              <button type="button" className="button button-secondary nav-button" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="button button-primary nav-button">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

export default function HomePage() {
  return (
    <section className="hero hero-landing reveal">
      <div className="hero-card hero-landing-card">
        <div className="eyebrow">Private wardrobe platform</div>
        <h1 className="hero-title display">
          Your closet, organized like a real app.
        </h1>
        <p className="hero-copy">
          Closet Atlas keeps your garments, materials, and care details in one private place.
          Sign in to open your wardrobe and start adding pieces.
        </p>
        <div className="hero-actions">
          <Link href="/login" className="button button-primary">
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

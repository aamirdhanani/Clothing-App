import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-aside">
        <div className="eyebrow">Private access</div>
        <h1 className="hero-title display" style={{ fontSize: "clamp(2.8rem, 6vw, 4.8rem)" }}>
          Sign in to your wardrobe.
        </h1>
        <p className="hero-copy">
          A private space for your collection, ready on mobile and desktop.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}

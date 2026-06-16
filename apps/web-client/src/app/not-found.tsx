import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="text-2xl font-bold text-white">Page introuvable</h1>
      <p className="max-w-md text-sm text-muted">
        La page que vous cherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link href="/" className="btn-primary mt-2">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

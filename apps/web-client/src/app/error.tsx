"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <p className="text-5xl font-extrabold text-red-400">Oups</p>
      <h1 className="text-2xl font-bold text-white">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted">
        Quelque chose s&apos;est mal passé. Vous pouvez réessayer ou revenir plus tard.
      </p>
      <div className="mt-2 flex gap-3">
        <button onClick={reset} className="btn-primary">
          Réessayer
        </button>
        <a href="/" className="btn-ghost">
          Accueil
        </a>
      </div>
    </div>
  );
}

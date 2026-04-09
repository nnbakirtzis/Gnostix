"use client";

import { useEffect } from "react";

export default function DocumentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // ChunkLoadError occurs in dev when Turbopack recompiles while the browser
    // holds a reference to old chunk hashes. A hard reload fetches fresh chunks.
    if (error.name === "ChunkLoadError") {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-sm text-[#6b5d4f]">Something went wrong loading this page.</p>
        <button
          onClick={reset}
          className="mt-4 text-sm text-[#b38f6f] hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

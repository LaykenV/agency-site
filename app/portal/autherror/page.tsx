import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthErrorContent from "./AuthErrorContent";

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)]" />
            <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}


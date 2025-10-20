"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const SESSION_STORAGE_KEY = "onboarding_session";

type StoredSession = {
  sessionId: string;
  resumeToken: string;
};

type UseSessionInitResult = {
  sessionId: string | null;
  resumeToken: string | null;
  isInitializing: boolean;
  error: Error | null;
};

export function useSessionInit(): UseSessionInitResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef(false);

  const initSession = useMutation(api.onboarding.sessions.initSession);

  const initializeSession = useCallback(async () => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    setIsInitializing(true);

    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem(SESSION_STORAGE_KEY) : null;

      if (stored) {
        const parsed: StoredSession = JSON.parse(stored);
        setSessionId(parsed.sessionId);
        setResumeToken(parsed.resumeToken);
        setIsInitializing(false);
        return;
      }

      const result = await initSession({});
      setSessionId(result.sessionId);
      setResumeToken(result.resumeToken);

      if (typeof window !== "undefined") {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({
            sessionId: result.sessionId,
            resumeToken: result.resumeToken,
          }),
        );
      }
    } catch (err) {
      console.error("Failed to initialize session", err);
      setError(err instanceof Error ? err : new Error("Session init failed"));
    } finally {
      setIsInitializing(false);
      initializingRef.current = false;
    }
  }, [initSession]);

  useEffect(() => {
    if (!sessionId && !initializingRef.current) {
      void initializeSession();
    }
  }, [sessionId, initializeSession]);

  return {
    sessionId,
    resumeToken,
    isInitializing,
    error,
  };
}


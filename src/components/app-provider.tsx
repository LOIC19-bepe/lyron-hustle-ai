"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import type { AuthUser, Business } from "@/lib/types";
import { Spinner, Button } from "@/components/ui";

type AppContextValue = {
  user: AuthUser;
  business: Business;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

type Status = "loading" | "ready" | "error";

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ user: AuthUser; business: Business | null }>("/api/auth/me")
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        if (!data.business) {
          router.replace("/onboarding");
          return;
        }
        setBusiness(data.business);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiClientError && error.status === 401) {
          router.replace("/login");
          return;
        }
        // Never a silent infinite spinner: clear message + retry button.
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Impossible de contacter le serveur."
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [router, reloadKey]);

  const refresh = useCallback(async () => {
    setReloadKey((k) => k + 1);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    router.replace("/login");
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-4xl">📡</div>
        <h1 className="text-lg font-semibold text-slate-900">
          Connexion au serveur impossible
        </h1>
        <p className="max-w-sm text-sm text-slate-500">{errorMessage}</p>
        <Button
          onClick={() => {
            setStatus("loading");
            setReloadKey((k) => k + 1);
          }}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  if (status !== "ready" || !user || !business) {
    return <Spinner label="Chargement de ton espace…" />;
  }

  return (
    <AppContext.Provider value={{ user, business, refresh, logout }}>
      {children}
    </AppContext.Provider>
  );
}

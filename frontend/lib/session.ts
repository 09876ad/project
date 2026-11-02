import { useSyncExternalStore } from "react";

export type UserRole = "customer" | "worker" | "admin";

export interface SessionUser {
  _id: string;
  name: string;
  role: UserRole;
}

export interface Session {
  token: string | null;
  user: SessionUser | null;
}

const EMPTY_SESSION: Session = { token: null, user: null };
const SESSION_EVENT = "skilllink:session";
const UNAUTHORIZED_EVENT = "skilllink:unauthorized";

let cachedKey = "\u0000";
let cachedSession: Session = EMPTY_SESSION;

export function isRole(value: unknown): value is UserRole {
  return value === "customer" || value === "worker" || value === "admin";
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<SessionUser>;
    if (
      typeof candidate._id !== "string" ||
      typeof candidate.name !== "string" ||
      !isRole(candidate.role)
    ) {
      return null;
    }
    return { _id: candidate._id, name: candidate.name, role: candidate.role };
  } catch {
    return null;
  }
}

export function readSession(): Session {
  if (typeof window === "undefined") return EMPTY_SESSION;
  try {
    const token = window.localStorage.getItem("token");
    const rawUser = window.localStorage.getItem("user");
    const key = `${token ?? ""}\u0000${rawUser ?? ""}`;
    if (key !== cachedKey) {
      cachedKey = key;
      cachedSession = token && rawUser ? { token, user: parseUser(rawUser) } : EMPTY_SESSION;
    }
    return cachedSession;
  } catch {
    return EMPTY_SESSION;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SESSION_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SESSION_EVENT, callback);
  };
}

export function notifySessionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function storeSession(token: string, user: SessionUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("user", JSON.stringify(user));
  } catch {
    return;
  }
  notifySessionChanged();
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
  } catch {
    // Storage can be unavailable (private mode); the session event still fires.
  }
  notifySessionChanged();
}

export function notifyUnauthorized() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}

// The server snapshot is `undefined` so callers can tell "not read yet" apart
// from "read and signed out". This avoids a redirect before hydration finishes.
export function useSession(): Session | undefined {
  return useSyncExternalStore(subscribe, readSession, () => undefined);
}

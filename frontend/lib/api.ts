import { clearSession, notifyUnauthorized } from "./session";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// A 401 means the stored session is gone or expired: clear it and let the
// layout-level session watcher send the user back to login via the router.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    clearSession();
    notifyUnauthorized();
  }
  return response;
}

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// A 401 means the stored session is gone or expired: clear it and send the
// user back to login instead of leaving a dashboard full of silent failures.
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
  return response;
}

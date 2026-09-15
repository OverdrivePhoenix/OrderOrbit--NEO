import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const res = await fetch(url, options);
    let data: any = {};
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      try {
        data = await res.json();
      } catch {
        data = {};
      }
    }

    if (!res.ok) {
      let errorMessage = data.error || data.message;
      if (!errorMessage) {
        if (res.status === 401) errorMessage = "Session expired. Please log in again.";
        else if (res.status === 404) errorMessage = "Requested service endpoint not found.";
        else if (res.status >= 500) errorMessage = "Server error occurred. Please try again.";
        else errorMessage = `Request failed (${res.status}).`;
      }
      return { ok: false, status: res.status, data: { error: errorMessage } as T };
    }

    return { ok: true, status: res.status, data };
  } catch (err: any) {
    const msg = err.message || "";
    const isJsonSyntaxErr = msg.includes("Unexpected token") || msg.includes("is not valid JSON") || msg.includes("JSON");
    return {
      ok: false,
      status: 0,
      data: {
        error: isJsonSyntaxErr
          ? "Invalid response from server. Please try again."
          : (msg || "Network error. Please check your connection."),
      } as T,
    };
  }
}

import { clearSession, getToken } from "./auth";

const defaultApiBaseUrl = `http://${window.location.hostname}:8000/api`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl;

export function getAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const SERVER_URL = API_BASE_URL.replace("/api", "");
  return `${SERVER_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

type ApiRequestOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
};

function buildHeaders(customHeaders: Record<string, string> = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function requestApi<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    body: options.body,
    headers: buildHeaders(options.headers),
  });

  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new CustomEvent("app:session-expired"));
    throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
  }

  if (!response.ok) {
    let message = `La API respondió con estado ${response.status}`;

    try {
      const errorData = (await response.json()) as { message?: string; error?: string };
      message = errorData.error ?? errorData.message ?? message;
    } catch {
      // keep default message
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchApi<T>(path: string): Promise<T> {
  return requestApi<T>(path);
}

export async function postApi<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  return requestApi<T>(path, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function postApiFormData<T>(path: string, formData: FormData): Promise<T> {
  return requestApi<T>(path, {
    method: "POST",
    body: formData,
  });
}

export async function putApi<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  return requestApi<T>(path, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function deleteApi<T>(path: string): Promise<T> {
  return requestApi<T>(path, {
    method: "DELETE",
  });
}

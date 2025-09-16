import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Token management
const TOKEN_KEY = 'sarvatra_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // If unauthorized, clear stored token
    if (res.status === 401) {
      removeStoredToken();
    }
    
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      removeStoredToken();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Logout utility function
export function logout() {
  removeStoredToken();
  queryClient.clear(); // Clear all cached queries
  // Redirect to login or refresh page
  window.location.reload();
}
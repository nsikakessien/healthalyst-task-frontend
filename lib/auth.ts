export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt_token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

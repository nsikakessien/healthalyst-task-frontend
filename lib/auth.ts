export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("jwt_token");
}

export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

export function clearAuthSession() {
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; path=/; max-age=0; SameSite=Lax";
}

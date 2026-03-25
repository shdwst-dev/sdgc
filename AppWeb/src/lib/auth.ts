type SessionUser = {
  rol?: string;
  [key: string]: unknown;
};

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getStoredRole(): string | null {
  return localStorage.getItem("rolUsuario");
}

export function saveSession(token: string, usuario: SessionUser) {
  localStorage.setItem("token", token);
  localStorage.setItem("usuario", JSON.stringify(usuario));

  if (usuario.rol) {
    localStorage.setItem("rolUsuario", usuario.rol);
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("rolUsuario");
}

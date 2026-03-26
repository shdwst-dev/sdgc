type SessionUser = {
  id_usuario?: number;
  rol?: string;
  [key: string]: unknown;
};

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getStoredRole(): string | null {
  return localStorage.getItem("rolUsuario");
}

export function getSessionHash(): string | null {
  return localStorage.getItem("sessionHash");
}

export function getStoredUser(): SessionUser | null {
  const rawUser = localStorage.getItem("usuario");

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    return null;
  }
}

export function saveSession(token: string, usuario: SessionUser, hash?: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("usuario", JSON.stringify(usuario));

  if (hash) {
    localStorage.setItem("sessionHash", hash);
  }

  if (usuario.rol) {
    localStorage.setItem("rolUsuario", usuario.rol);
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem("rolUsuario");
  localStorage.removeItem("sessionHash");
}

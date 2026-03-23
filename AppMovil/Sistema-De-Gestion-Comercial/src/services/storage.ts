// Variable global simple para guardar el token en memoria durante la ejecución de la app móvil.
// Esto es temporal; para persistencia real se debería usar algo como AsyncStorage.

let authToken: string | null = null;

export const setToken = (token: string | null) => {
  authToken = token;
};

export const getToken = () => {
  return authToken;
};


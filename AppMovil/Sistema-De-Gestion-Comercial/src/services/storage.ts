import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@sdgc/auth-token';

let authToken: string | null = null;
let hasHydratedToken = false;

export const setToken = async (token: string | null): Promise<void> => {
  authToken = token;
  hasHydratedToken = true;

  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
};

export const clearToken = async (): Promise<void> => {
  await setToken(null);
};

export const hydrateToken = async (): Promise<string | null> => {
  if (hasHydratedToken) {
    return authToken;
  }

  authToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  hasHydratedToken = true;

  return authToken;
};

export const getToken = (): string | null => authToken;


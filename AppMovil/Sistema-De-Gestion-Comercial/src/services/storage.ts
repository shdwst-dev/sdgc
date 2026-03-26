import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = '@sdgc/auth-token';
const AUTH_HASH_KEY = '@sdgc/auth-hash';

let authToken: string | null = null;
let authHash: string | null = null;
let hasHydratedToken = false;
let hasHydratedHash = false;

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

export const setHash = async (hash: string | null): Promise<void> => {
  authHash = hash;
  hasHydratedHash = true;

  if (hash) {
    await AsyncStorage.setItem(AUTH_HASH_KEY, hash);
    return;
  }

  await AsyncStorage.removeItem(AUTH_HASH_KEY);
};

export const clearHash = async (): Promise<void> => {
  await setHash(null);
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

export const hydrateHash = async (): Promise<string | null> => {
  if (hasHydratedHash) {
    return authHash;
  }

  authHash = await AsyncStorage.getItem(AUTH_HASH_KEY);
  hasHydratedHash = true;

  return authHash;
};

export const getHash = (): string | null => authHash;

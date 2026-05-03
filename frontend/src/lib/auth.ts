type JwtPayload = {
  userId?: number;
  email?: string;
  name?: string;
  profileImage?: string | null;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

export type StoredAuthUser = {
  id?: number;
  name?: string;
  email?: string;
  profileImage?: string | null;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

export type AuthSession = {
  displayName: string;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  profileImage?: string | null;
};

const AUTH_TOKEN_KEY = "token";
const AUTH_USER_KEY = "user";
const AUTH_CHANGE_EVENT = "toolora-auth-change";

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(paddedBase64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

const getSessionStorage = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
};

const getLegacyStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const readStoredValue = (key: string) => {
  const sessionStorageRef = getSessionStorage();
  if (sessionStorageRef) {
    const sessionValue = sessionStorageRef.getItem(key);
    if (sessionValue !== null) {
      return sessionValue;
    }
  }

  const legacyStorageRef = getLegacyStorage();
  if (legacyStorageRef) {
    const legacyValue = legacyStorageRef.getItem(key);
    if (legacyValue !== null) {
      sessionStorageRef?.setItem(key, legacyValue);
      legacyStorageRef.removeItem(key);
      return legacyValue;
    }
  }

  return null;
};

const writeStoredValue = (key: string, value: string) => {
  const sessionStorageRef = getSessionStorage();
  if (!sessionStorageRef) return;

  sessionStorageRef.setItem(key, value);
  getLegacyStorage()?.removeItem(key);
};

const removeStoredValue = (key: string) => {
  getSessionStorage()?.removeItem(key);
  getLegacyStorage()?.removeItem(key);
};

const dispatchAuthChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

export const getAuthToken = () => readStoredValue(AUTH_TOKEN_KEY);

export const readStoredAuthUser = (): StoredAuthUser | null => {
  const storedUser = readStoredValue(AUTH_USER_KEY);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as StoredAuthUser;
  } catch {
    return null;
  }
};

export const saveAuthSession = (token: string, user: StoredAuthUser) => {
  writeStoredValue(AUTH_TOKEN_KEY, token);
  writeStoredValue(AUTH_USER_KEY, JSON.stringify(user));
  dispatchAuthChange();
};

export const updateAuthUser = (user: StoredAuthUser) => {
  writeStoredValue(AUTH_USER_KEY, JSON.stringify(user));
  dispatchAuthChange();
};

export const clearAuthSession = () => {
  removeStoredValue(AUTH_TOKEN_KEY);
  removeStoredValue(AUTH_USER_KEY);
  dispatchAuthChange();
};

export const readAuthSession = (): AuthSession | null => {
  const token = getAuthToken();
  const tokenPayload = token ? decodeJwtPayload(token) : null;

  const storedUser = readStoredAuthUser();
  if (storedUser) {
    const displayName = storedUser.name ?? storedUser.email ?? null;
    if (!displayName) return null;

    return {
      displayName,
      isOwner: Boolean(storedUser.isOwner || tokenPayload?.isOwner),
      isAdmin: Boolean(storedUser.isAdmin || tokenPayload?.isAdmin),
      isModerator: Boolean(storedUser.isModerator || tokenPayload?.isModerator),
      profileImage: storedUser.profileImage ?? null,
    };
  }

  if (!tokenPayload && !token) return null;

  const payload = tokenPayload ?? null;
  if (!payload) return null;

  return {
    displayName: payload.name ?? payload.email ?? "Usuário logado",
    isOwner: Boolean(payload.isOwner),
    isAdmin: Boolean(payload.isAdmin),
    isModerator: Boolean(payload.isModerator),
    profileImage: null,
  };
};

export const hasAdminAccess = (session: AuthSession | null) => Boolean(session?.isOwner || session?.isAdmin);
export const hasModeratorAccess = (session: AuthSession | null) => Boolean(session?.isOwner || session?.isAdmin || session?.isModerator);
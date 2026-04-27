type JwtPayload = {
  email?: string;
  name?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = atob(paddedBase64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

export type AuthSession = {
  displayName: string;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  profileImage?: string | null;
};

export const readAuthSession = (): AuthSession | null => {
  const token = localStorage.getItem("token");
  const tokenPayload = token ? decodeJwtPayload(token) : null;

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser) as { name?: string; email?: string; isOwner?: boolean; isAdmin?: boolean; isModerator?: boolean; profileImage?: string | null };
      const displayName = parsed.name ?? parsed.email ?? null;
      if (!displayName) return null;

      return {
        displayName,
        isOwner: Boolean(parsed.isOwner || tokenPayload?.isOwner),
        isAdmin: Boolean(parsed.isAdmin || tokenPayload?.isAdmin),
        isModerator: Boolean(parsed.isModerator || tokenPayload?.isModerator),
        profileImage: parsed.profileImage ?? null,
      };
    } catch {
      return null;
    }
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
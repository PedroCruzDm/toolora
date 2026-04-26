type JwtPayload = {
  email?: string;
  name?: string;
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

export const readAuthSession = (): AuthSession | null => {
  const token = localStorage.getItem("token");
  let tokenPayload: JwtPayload | null = null;

  if (token) {
    try {
      tokenPayload = JSON.parse(atob(token.split(".")[1])) as JwtPayload;
    } catch {
      tokenPayload = null;
    }
  }

  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser) as { name?: string; email?: string; isOwner?: boolean; isAdmin?: boolean; isModerator?: boolean; profileImage?: string | null };
      const displayName = parsed.name ?? parsed.email ?? null;
      if (!displayName) return null;

      return {
        displayName,
        isOwner: Boolean(parsed.isOwner ?? tokenPayload?.isOwner),
        isAdmin: Boolean(parsed.isAdmin ?? tokenPayload?.isAdmin),
        isModerator: Boolean(parsed.isModerator ?? tokenPayload?.isModerator),
        profileImage: parsed.profileImage ?? null,
      };
    } catch {
      return null;
    }
  }

  if (!tokenPayload && !token) return null;

  const payload = tokenPayload ?? (JSON.parse(atob(token!.split(".")[1])) as JwtPayload);
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
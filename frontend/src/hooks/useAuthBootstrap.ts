import { useEffect, useState } from "react";
import api from "@/services/api";
import { getAuthToken, readStoredAuthUser, updateAuthUser } from "@/lib/auth";

type BootstrapUser = {
  id: string;
  displayName: string;
  name: string;
  email: string;
  profileImage?: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
};

type MeResponse = {
  user: {
    id: string;
    name?: string;
    email: string;
    isOwner?: boolean;
    isAdmin?: boolean;
    isModerator?: boolean;
    profileImage?: string | null;
  };
};

const buildUserFromStorage = (): BootstrapUser | null => {
  const storedUser = readStoredAuthUser();
  const token = getAuthToken();

  if (storedUser || token) {
    return {
      id: String(storedUser?.id ?? ""),
      displayName: storedUser?.name ?? storedUser?.email ?? "",
      name: storedUser?.name ?? storedUser?.email ?? "",
      email: storedUser?.email ?? "",
      profileImage: storedUser?.profileImage ?? null,
      isOwner: Boolean(storedUser?.isOwner),
      isAdmin: Boolean(storedUser?.isAdmin),
      isModerator: Boolean(storedUser?.isModerator),
    };
  }

  return null;
};

export const useAuthBootstrap = () => {
  const [user, setUser] = useState<BootstrapUser | null>(() => buildUserFromStorage());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const token = getAuthToken();
      if (!token) {
        if (active) setReady(true);
        return;
      }

      try {
        const response = await api.get<MeResponse>("/auth/me");
        if (!active) return;

        const currentUser = response.data.user;
        const mappedUser: BootstrapUser = {
          id: currentUser.id,
          displayName: currentUser.name ?? currentUser.email,
          name: currentUser.name ?? currentUser.email,
          email: currentUser.email,
          profileImage: currentUser.profileImage ?? null,
          isOwner: Boolean(currentUser.isOwner),
          isAdmin: Boolean(currentUser.isAdmin),
          isModerator: Boolean(currentUser.isModerator),
        };

        setUser(mappedUser);
        updateAuthUser({
          id: Number(mappedUser.id) || undefined,
          name: mappedUser.name,
          email: mappedUser.email,
          profileImage: mappedUser.profileImage,
          isOwner: mappedUser.isOwner,
          isAdmin: mappedUser.isAdmin,
          isModerator: mappedUser.isModerator,
        });
      } catch {
        if (active) {
          setUser(buildUserFromStorage());
        }
      } finally {
        if (active) setReady(true);
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  return { user, ready };
};

export type { BootstrapUser };

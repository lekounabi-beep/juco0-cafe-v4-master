import { getOrCreateProfile } from "@/integrations/supabase/services/profile.service";

type ProfileCacheEntry = {
  userId: string;
  profileId: string;
};

let profileCache: ProfileCacheEntry | null = null;
let profileInflight: Promise<ProfileCacheEntry | null> | null = null;

export function clearAccountProfileCache(userId?: string): void {
  if (!userId || profileCache?.userId === userId) {
    profileCache = null;
    profileInflight = null;
  }
}

export async function resolveAccountProfileId(
  userId: string,
  email?: string | null,
  fullName?: string | null,
): Promise<string | null> {
  if (profileCache?.userId === userId) {
    return profileCache.profileId;
  }

  if (!profileInflight) {
    profileInflight = (async () => {
      try {
        const profile = await getOrCreateProfile(userId, email ?? undefined, fullName ?? undefined);
        const entry = { userId, profileId: profile.id };
        profileCache = entry;
        return entry;
      } finally {
        profileInflight = null;
      }
    })();
  }

  const entry = await profileInflight;
  return entry?.profileId ?? null;
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ColdProfileStore {
    userProfile: object | null;
    userProfileText: string;
    setUserProfile: (userProfile: object) => void;
    setUserProfileText: (userProfileText: string) => void;
    clearUserProfile: () => void;
}

export const useColdProfileStore = create<ColdProfileStore>()(persist((set) => ({
    userProfile: null,
    userProfileText: "",
    setUserProfile: (userProfile: object) => set({ userProfile }),
    setUserProfileText: (userProfileText: string) => set({ userProfileText }),
    clearUserProfile: () => set({ userProfile: null }),
}), {
    name: "reco_user_profile"
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ColdProfileStore {
    userProfile: object | null;
    setUserProfile: (userProfile: object) => void;
    clearUserProfile: () => void;
}

export const useColdProfileStore = create<ColdProfileStore>()(persist((set) => ({
    userProfile: null,
    setUserProfile: (userProfile: object) => set({ userProfile }),
    clearUserProfile: () => set({ userProfile: null }),
}), {
    name: "reco_user_profile"
}))

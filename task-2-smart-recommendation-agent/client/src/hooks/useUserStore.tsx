import {create} from "zustand";

interface DemoUserState {
    username: string | null;
    user_id: string | null ;
    avatarUrl: string | null;
    setUser: (username: string, user_id: string, avatarUrl: string) => void;
    clearDemoUser: () => void;
}

export const useUserStore = create<DemoUserState>((set) => ({
    username: null,
    user_id: null,
    avatarUrl: null,
    
    setUser: (username: string, user_id: string, avatarUrl: string) => set({ username, user_id, avatarUrl }),
    clearDemoUser: () => set({ username: null, user_id: null, avatarUrl: null }),
}))

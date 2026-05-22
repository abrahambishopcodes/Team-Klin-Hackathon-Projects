import type { MessageType } from "@/pages/components/conversation-messages"
import type { AiRecommendproductResponse } from "@/types";
import { nanoid } from "nanoid";
import {create} from "zustand"

interface MessageState {
    messages: MessageType[];
    addMessage: (value: AiRecommendproductResponse["data"] | string, sender: MessageType["sender"], name: string) => void;
    clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
    messages: [],
    addMessage: (value: AiRecommendproductResponse["data"] | string, sender: MessageType["sender"], name: string) => set((state) => ({ messages: [...state.messages, {key: nanoid(), value, sender, name}] })),
    clearMessages: () => set({ messages: [] }),
}))
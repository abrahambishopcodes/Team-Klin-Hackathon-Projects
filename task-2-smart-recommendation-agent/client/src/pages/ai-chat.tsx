import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { MessageSquare} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Send } from "lucide-react";
import NoMessageScreen from "./no-message-screen";
import { ConversationMessages } from "./components/conversation-messages";

import type { MessageType } from "./components/conversation-messages";
import { nanoid } from "nanoid";
import { generateRecommendation } from "@/api/index.api";
import type { AiRecommendproductResponse } from "@/types";

import { Loader } from "@/components/ui/loader";

import { useMutation } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge";

import {useUserStore} from "@/hooks/useUserStore";

const AiChatPage = () => {

  const [prompt, setPrompt] = useState("");

  const {username, user_id, avatarUrl} = useUserStore();

  // 
  const [messages, setMessages] = useState<MessageType[]>([]);
  const addToMessage = (value: AiRecommendproductResponse["data"] | string, sender: MessageType["sender"], name: string) => {
    setMessages((prev) => [...prev, {
      key: nanoid(),
      value,
      name,
      sender,
    }]);
  }

  // mutation hook to handle api recommendation call
  const {mutateAsync, isPending} = useMutation({
    mutationFn: (prompt: string) => generateRecommendation({
      user_query: prompt,
      user_id: user_id,
      cold_start: user_id ? false : true,
      user_persona: user_id ? null : JSON.parse(localStorage.getItem("reco_user_profile") || "{}"),
    }),
    onSuccess: (data) => {
      if (data.success) {
        addToMessage(data.data, "assistant", "Reco");
      }
    },
    onError: (error: Error) => {
      console.log(error);
      addToMessage("Sorry, I'm having trouble getting the task done, try again! If issue persists, contact support or try again later.", "assistant", "Reco");
    }
  })

  // handle send messages
  const handleSendPrompt = async (prompt: string) => {
    if (!prompt) return;

    // TODO: Add reasoning streaming
    addToMessage(prompt, "user", "User");

    // send user query to api
    await mutateAsync(prompt);

    setPrompt("");
  }

  return (
    <section className="section">

      {/* Show no message screen if no messages */}
      {
        messages.length === 0 ? (
          <NoMessageScreen setPrompt={setPrompt} />
        ) : (
          <ConversationMessages messages={messages} isPending={isPending} />
        )
      }

      {/* prompt input */}
      <div className="max-w-5xl w-full flex flex-col mt-auto gap-2 mb-8">

        <Badge className="bg-muted text-foreground text-sm p-4">
          {user_id && <img src={avatarUrl} alt={username} className="size-6 rounded-full" />}
          {user_id ? username : "Cold Start - You"}
        </Badge>

        <InputGroup className="bg-muted border-border p-2 flex items-center">
          <InputGroupAddon align="inline-start">
            <MessageSquare className="size-5 text-foreground" />
          </InputGroupAddon>
          <InputGroupTextarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
            className="placeholder:text-foreground/50 placeholder:text-sm ml-4"
            placeholder="Ask Reco something to find ..."
          />

          <InputGroupAddon align="inline-end">
            <Button disabled={isPending} onClick={() => handleSendPrompt(prompt)}>
              {isPending ? <Loader size={24} /> : <Send className="size-5" />}
            </Button>
          </InputGroupAddon>

        </InputGroup>
      </div>
    </section>
  );
};

export default AiChatPage;

import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Send } from "lucide-react";
import NoMessageScreen from "./no-message-screen";
import { ConversationMessages } from "./components/conversation-messages";

import type { MessageType } from "./components/conversation-messages";
import { nanoid } from "nanoid";

const AiChatPage = () => {

  const [prompt, setPrompt] = useState("");

  // 
  const [messages, setMessages] = useState<MessageType[]>([]);

  // handle send messages
  const handleSendPrompt = (prompt: string) => {
    if (!prompt) return;
    setMessages((prev) => [...prev, {
      key: nanoid(),
      value: prompt,
      name: "Abraham",
      sender: "user",
    }]);
    setPrompt("");
  }


  return (
    <section className="section">

      {/* Show no message screen if no messages */}
      {
        messages.length === 0 ? (
          <NoMessageScreen setPrompt={setPrompt} />
        ) : (
          <ConversationMessages messages={messages} />
        )
      }

      {/* prompt input */}
      <div className="max-w-5xl w-full flex items-center  mt-auto">
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
            <Button onClick={() => handleSendPrompt(prompt)}>
              <Send className="size-5" />
            </Button>
          </InputGroupAddon>

        </InputGroup>
      </div>
    </section>
  );
};

export default AiChatPage;

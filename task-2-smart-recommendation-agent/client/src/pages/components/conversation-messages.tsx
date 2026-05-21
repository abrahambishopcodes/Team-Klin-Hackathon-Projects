import { Conversation,
  ConversationContent,
  ConversationScrollButton, } from "@/components/ui/conversation"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message"
import type { AiRecommendproductResponse } from "@/types"

export interface MessageType {
  key: string
  value: AiRecommendproductResponse["data"] | string,
  sender: "user" | "assistant",
  name: string,
}

  interface ConversationMessagesProps {
    messages: MessageType[]
  }

export function ConversationMessages({messages}: ConversationMessagesProps) {


  return (
    <Conversation className="relative size-full">
      <ConversationContent>
          {messages.map(({ key, value, name, sender }) => (
            <Message from={sender} key={key}>
              <MessageContent className="text-lg">{
                typeof value === "string" ? value : value.main_reasoning
                }</MessageContent>
              {sender === "assistant" && <MessageAvatar name={name} src="/reco_logo.svg" />}
            </Message>
          ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

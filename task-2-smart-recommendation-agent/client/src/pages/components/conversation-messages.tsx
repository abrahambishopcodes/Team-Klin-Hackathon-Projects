import { nanoid } from "nanoid"


import { Conversation,
  ConversationContent,
  ConversationScrollButton, } from "@/components/ui/conversation"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message"

export interface MessageType {
  key: string
  value: string,
  sender: "user" | "assistant",
  name: string,
}

const messages: MessageType[] =
  [
    {
      key: nanoid(),
      value: "Hello, how are you?",
      sender: "user",
      name: "Alex Johnson",
    },
    {
      key: nanoid(),
      value: "I'm good, thank you! How can I assist you today?",
      sender: "assistant",
      name: "AI Assistant",
    },
    {
      key: nanoid(),
      value: "I'm looking for information about your services.",
      sender: "user",
      name: "Alex Johnson",
    },
  ]

  interface ConversationMessagesProps {
    messages: MessageType[]
  }

export function ConversationMessages({messages}: ConversationMessagesProps) {


  return (
    <Conversation className="relative size-full">
      <ConversationContent>
          {messages.map(({ key, value, name, sender }, index) => (
            <Message from={sender} key={key}>
              <MessageContent className="text-lg">{value}</MessageContent>
              {sender === "assistant" && <MessageAvatar name={name} src="/reco_logo.svg" />}
            </Message>
          ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

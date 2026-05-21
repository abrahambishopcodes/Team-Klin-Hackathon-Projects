import { Conversation,
  ConversationContent,
  ConversationScrollButton, } from "@/components/ui/conversation"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message"
import ProductCard from "./product-card"
import type { AiRecommendproductResponse } from "@/types"

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/reasoning"

import { ScrollArea } from "@/components/ui/scroll-area"

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
    <Conversation className="relative size-full max-w-5xl">
      <ScrollArea className="h-full">
      <ConversationContent>
          {messages.map(({ key, value, name, sender }) => (
            <Message from={sender} key={key}>
              <MessageContent className="text-lg">{
                typeof value === "string" ? value : 
                
                // AI response
                (<div>
                  <Reasoning isStreaming={false} duration={Number(value.tokenUsage.completion_time.toFixed(2))}>
                    <ReasoningTrigger className="text-yellow-300 hover:text-yellow-400" />
                    <ReasoningContent className="text-gray-300 font-mono">{value.main_reasoning}</ReasoningContent>
                  </Reasoning>

                  {/* products card and reasoning */}
                  {/* TODO: Add better empty state */}
                  <div className="flex flex-col gap-8 mt-4">
                    {value.products.length > 0 ? value.products.map((product, i) => (
                      <div className="" key={product.parent_asin}>
                        <ProductCard product={product} index={i} />
                      </div>
                    )) : <p>No products found</p>}
                  </div>
                </div>)


                }</MessageContent>
              {sender === "assistant" && <MessageAvatar name={name} src="/reco_logo.svg" />}
            </Message>
          ))}
      </ConversationContent>
      <ConversationScrollButton />
    </ScrollArea>
    </Conversation>
  )
}

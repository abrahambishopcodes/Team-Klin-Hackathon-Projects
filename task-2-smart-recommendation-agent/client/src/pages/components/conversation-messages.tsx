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
                typeof value === "string" ? value : 
                
                // AI response
                (<div>
                  <p className="text-sm">{value.main_reasoning}</p>

                  {/* products card and reasoning */}
                  <div className="flex flex-col gap-6 mt-4">
                    {value.products.map((product, i) => (
                      <div className="" key={product.parent_asin}>
                        <ProductCard product={product} index={i} />
                      </div>
                    ))}
                  </div>
                </div>)


                }</MessageContent>
              {sender === "assistant" && <MessageAvatar name={name} src="/reco_logo.svg" />}
            </Message>
          ))}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}

import { Conversation,
  ConversationContent,
  ConversationScrollButton, } from "@/components/ui/conversation"
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message"
import { Loader } from "@/components/ui/loader"
import ProductCard from "./product-card"
import type { AiRecommendproductResponse } from "@/types"
import { SearchX } from "lucide-react"

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ui/reasoning"

import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"

export interface MessageType {
  key: string
  value: AiRecommendproductResponse["data"] | string,
  sender: "user" | "assistant",
  name: string,
}

  interface ConversationMessagesProps {
    messages: MessageType[],
    isPending: boolean,
  }

export function ConversationMessages({messages, isPending}: ConversationMessagesProps) {

  const [open, setOpen] = useState(true);

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
                  <Reasoning open={open} onOpenChange={setOpen} isStreaming={false} duration={Number(value.tokenUsage.completion_time.toFixed(2))}>
                    <ReasoningTrigger className="text-yellow-300 hover:text-yellow-400" />
                    <ReasoningContent  className="text-gray-300 font-mono">{value.main_reasoning}</ReasoningContent>
                  </Reasoning>

                  {value.products.length > 0 && (
                    <h3 className="text-lg font-semibold mt-4 mb-2">
                      {value.products.length} Total Recommendation{value.products.length === 1 ? "" : "s"}
                    </h3>
                  )}

                  {/* products card and reasoning */}
                  {value.products.length > 0 ? (
                    <div className="flex flex-col gap-8 mt-4">
                      {value.products.map((product, i) => (
                        <div key={product.parent_asin}>
                          <ProductCard product={product} index={i} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-6 mt-6 border-2 border-dashed border-border/40 rounded-xl bg-card/40 text-center">
                      <div className="bg-secondary/80 p-4 rounded-full mb-4">
                        <SearchX className="size-8 text-muted-foreground" />
                      </div>
                      <h4 className="text-base font-semibold text-foreground mb-2">No matching products found</h4>
                      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                        Reco couldn't find any products that match your request. Try adjusting your preferences or searching with different keywords.
                      </p>
                    </div>
                  )}
                </div>)


                }</MessageContent>

              {sender === "assistant" && <MessageAvatar name={name} src="/reco_logo.svg" />}
            </Message>
          ))}
          {/* When isPending is true, show loading state */}
          {isPending && (
            <Message from="assistant">
              <MessageContent className="text-lg">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader size={20} />
                  <span>Reco is thinking...</span>
                </div>
              </MessageContent>
              <MessageAvatar name="Reco" src="/reco_logo.svg" />
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </ScrollArea>
    </Conversation>
  )
}

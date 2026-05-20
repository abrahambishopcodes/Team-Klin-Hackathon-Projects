import { Suggestion, Suggestions } from "@/components/ui/suggestion"

const starterPrompts = [
    "I need a power bank that can charge my laptop on the go",
    "I want to start a home gym with minimal equipment",
    "Find me healthy snacks I can order in bulk",
    "What are the best noise cancelling headphones for travel?",
    "I'm looking for a gift for my dad who loves golf",
]

const AiChatPage = () => {
  return (
    <section className="w-full h-full flex flex-col items-center justify-center">
        {/* Brand Section */}
        <div className="flex flex-col items-center gap-4">
            {/* logo */}
            <img src="/reco_logo.svg" alt="Reco AI" className="size-24 scale-150" />
            <h1>Reco</h1>
            <p>Products picked for you, not everyone</p>
        </div>

        {/* Starter Prompts */}
        <div className="w-full flex mt-10">
            <Suggestions className="flex flex-wrap w-[80%] mx-auto justify-center gap-y-4">
                {starterPrompts.map((prompt, index) => (
                    <Suggestion className="p-4" key={index} suggestion={prompt} onClick={() => {}} />
                ))}
            </Suggestions>
        </div>
    </section>
  )
}

export default AiChatPage
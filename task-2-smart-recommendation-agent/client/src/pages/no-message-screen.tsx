import { Suggestion, Suggestions } from "@/components/ui/suggestion";
import { useColdProfileStore } from "@/hooks/useColdProfileStore";

import ColdProfileDescriptionCard from "./components/cold-profile-description-card";

const starterPrompts = [
  "I need a power bank that can charge my laptop on the go",
  "I want to start a home gym with minimal equipment",
  "Find me healthy snacks I can order in bulk",
  "What are the best noise cancelling headphones for travel?",
  "I'm looking for a gift for my dad who loves golf",
];

interface NoMessageScreenProps {
  setPrompt: (prompt: string) => void;
}

const NoMessageScreen = ({ setPrompt }: NoMessageScreenProps) => {
  const userProfile = useColdProfileStore((state) => state.userProfile);
  
  return (
    <section className="section">
      {/* Brand Section */}
      <div className="flex flex-col items-center gap-4">
        {/* logo */}
        <img src="/reco_logo.svg" alt="Reco AI" className="size-24 scale-150" />
        <h1>Reco</h1>
        <p>Products picked for you, not everyone</p>
      </div>

      {/* Conversation Messages */}
      <div className="w-full">{/* <ConversationMessages /> */}</div>

      {/* Starter Prompts */}
      <div className="w-full flex">
        <Suggestions className="flex flex-wrap w-[80%] mx-auto justify-center gap-y-4">
          {starterPrompts.map((prompt, index) => (
            <Suggestion
              className="p-4 text-sm"
              key={index}
              suggestion={prompt}
              onClick={(suggestion) => setPrompt(suggestion)}
            />
          ))}
        </Suggestions>
      </div>

      {/* Text area for cold start when there is no user profile */}
      {!userProfile && (
        <ColdProfileDescriptionCard />
      )}
    </section>
  );
};

export default NoMessageScreen;

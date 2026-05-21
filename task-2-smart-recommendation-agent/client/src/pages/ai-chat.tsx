import { Suggestion, Suggestions } from "@/components/ui/suggestion";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Info, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { ConversationMessages } from "./components/conversation-messages";

const starterPrompts = [
  "I need a power bank that can charge my laptop on the go",
  "I want to start a home gym with minimal equipment",
  "Find me healthy snacks I can order in bulk",
  "What are the best noise cancelling headphones for travel?",
  "I'm looking for a gift for my dad who loves golf",
];

const AiChatPage = () => {

  const userProfileKey = "reco_user_profile"

  // state for user profile
  const [userProfile, setUserProfile] = useState(localStorage.getItem(userProfileKey));
  const [userProfileText, setUserProfileText] = useState("");
  const [prompt, setPrompt] = useState("");

  // 
  const [messages, setMessages] = useState([]);

  // function to save user profile to local storage
  const handleSaveUserProfile = () => {
    localStorage.setItem(userProfileKey, userProfileText);
    setUserProfile(userProfileText);
  };

  return (
    <section className="w-full h-full flex flex-col items-center justify-center gap-12">
      {/* Brand Section */}
      <div className="flex flex-col items-center gap-4">
        {/* logo */}
        <img src="/reco_logo.svg" alt="Reco AI" className="size-24 scale-150" />
        <h1>Reco</h1>
        <p>Products picked for you, not everyone</p>
      </div>

      {/* Conversation Messages */}
      <div className="w-full">
          {/* <ConversationMessages /> */}
      </div>

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
      {!userProfile && <div className="w-full flex justify-center">
        <Field className="w-full max-w-2xl">
          <FieldLabel className="font-bold text-2xl flex items-center gap-2 mb-1">
            <img src="/snow_flake.svg" className="size-6" alt="" />
            Tell us a little about yourself first
          </FieldLabel>
          <InputGroup className="bg-secondary border-border p-2 focus-visible:ring-0">
            <InputGroupTextarea
            value={userProfileText}
            onChange={(e) => setUserProfileText(e.target.value)}
              className="placeholder:text-foreground/50 placeholder:text-sm"
              placeholder="I'm a 28-year-old Lagos professional. I love tech gadgets, value for money 
matters to me, I recently started home fitness..."
            />
            <InputGroupAddon align="block-end">
              <Button className="font-bold" onClick={handleSaveUserProfile}>Save</Button>
              <Button className="font-bold">Use Template</Button>
              <p className="ml-auto text-foreground/50">0 / 500</p>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription className="text-foreground/50 flex items-center gap-2">
            <Info className="size-4" />
            No history needed. Just tell us about your preferences, lifestyle,
            or what you're looking for.
          </FieldDescription>
        </Field>
      </div>}

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
            <Button>
              <Send className="size-5" />
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </section>
  );
};

export default AiChatPage;

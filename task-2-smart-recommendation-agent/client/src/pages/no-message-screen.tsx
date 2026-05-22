import { Suggestion, Suggestions } from "@/components/ui/suggestion";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { generateColdStartUserProfile } from "@/api/index.api";

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
  const userProfileKey = "reco_user_profile";
  const [userProfileText, setUserProfileText] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  // useEffect to get user profile from local storage
  useEffect(() => {

    async function getUserProfile() {
      const userProfile = localStorage.getItem(userProfileKey);
      if (userProfile) {
        setUserProfile(JSON.parse(userProfile));
      }
    }

    getUserProfile();
  }, []);

  // function to save user profile to local storage
  const handleSaveUserProfile = async () => {
    // If there is no use profile text
    if (!userProfileText) {
      toast("You need to tell us a little about yourself first");
      return;
    }

    // Generate user profile
    const coldStartUserProfile = await toast.promise(
      generateColdStartUserProfile(userProfileText),
      {
        loading: "Generating user profile...",
        success: "User profile generated successfully",
        error: "Failed to generate user profile",
      },
    );

    // If user profile is generated successfully
    if (coldStartUserProfile.success) {
      localStorage.setItem(
        userProfileKey,
        JSON.stringify(coldStartUserProfile.data),
      );
      setUserProfile(coldStartUserProfile.data);
    }
  };

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
        <div className="w-full flex justify-center">
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
                <Button className="font-bold" onClick={handleSaveUserProfile}>
                  Save
                </Button>
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
        </div>
      )}
    </section>
  );
};

export default NoMessageScreen;

import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { generateColdStartUserProfile } from "@/api/index.api";
import toast from "react-hot-toast";
import { useColdProfileStore } from "@/hooks/useColdProfileStore";

const ColdProfileDescriptionCard = () => {

    const [userProfileText, setUserProfileText] = useState("");
    const setUserProfile = useColdProfileStore((state) => state.setUserProfile);

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
            "reco_user_profile",
            JSON.stringify(coldStartUserProfile.data),
          );
          setUserProfile(coldStartUserProfile.data);
        }
      };
    

  return (
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
  )
}

export default ColdProfileDescriptionCard
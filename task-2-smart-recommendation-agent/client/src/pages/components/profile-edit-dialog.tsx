import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import ColdProfileDescriptionCard from "./cold-profile-description-card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export function ProfileEditDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="button mt-1 h-10 bg-transparent">
          <Settings />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-3xl!">
        <div>
          <ColdProfileDescriptionCard />
        </div>
      </DialogContent>
    </Dialog>
  )
}

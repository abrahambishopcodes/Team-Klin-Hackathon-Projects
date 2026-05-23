import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Rating } from "@/components/ui/rating";

export function AddReviewDialog () {
    return (
        <Dialog>
            <DialogTrigger>
                <Button className="text-lg" variant="outline">
                    <PlusCircle />
                    Add Review
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl!">
                <DialogHeader>
                    <DialogTitle>Add Review</DialogTitle>
                    <form className="flex flex-col gap-4"> 
                        <Field>
                            <FieldLabel>Product Name</FieldLabel>
                            <Input placeholder="e.g iPhone 15 Pro Max" />
                        </Field>
                        <Field>
                            <FieldLabel>Product Category</FieldLabel>
                            <Input placeholder="e.g Electronics" />
                        </Field>
                        <Field>
                            <FieldLabel>Product Rating</FieldLabel>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    {
                                        [1,2,3,4,5].map((rating) => (
                                            <SelectItem key={rating} value={rating.toString()}>
                                                <p className="font-bold">{rating}</p>
                                                <Rating rating={rating} />
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Product Review Text</FieldLabel>
                            <Textarea />
                        </Field>
                    </form>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}
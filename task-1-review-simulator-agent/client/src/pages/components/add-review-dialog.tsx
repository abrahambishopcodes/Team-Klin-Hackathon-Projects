import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import { Rating } from "@/components/ui/rating";
import { useForm, useWatch } from "react-hook-form";
import { useReviewsStore } from "@/hooks/useReviewsStore";

import { useState } from "react";

export interface ReviewFormValues {
    item: string;
    category: string;
    stars: number;
    text: string;
}

export function AddReviewDialog () {

    const addReview = useReviewsStore((state) => state.addReview)
    const [open, setOpen] = useState(false)

    const {register, control, formState, handleSubmit, reset} = useForm<ReviewFormValues>({
        defaultValues: {
            item: "",
            category: "",
            stars: 0,
            text: ""
        }
    })

    const starsWatchedValue = useWatch({
        control,
        name: "stars"
    })
    const watchedStars = Number.isFinite(starsWatchedValue) ? starsWatchedValue : 0
    const errors = formState.errors;

    const onSubmit = (data: ReviewFormValues) => {
        addReview(data)
        reset()
        setOpen(false)
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
                <Button className="text-lg" variant="outline">
                    <PlusCircle />
                    Add Review
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl!">
                <DialogHeader>
                    <DialogTitle>Add Review</DialogTitle>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4"> 
                        <Field>
                            <FieldLabel>Product Name</FieldLabel>
                            <Input required {...register("item")} placeholder="e.g iPhone 15 Pro Max" />
                        </Field>
                        <Field>
                            <FieldLabel>Product Category</FieldLabel>
                            <Input required {...register("category")} placeholder="e.g Electronics" />
                        </Field>
                        <Field>
                            <FieldLabel>Product Rating</FieldLabel>
                           <div className="flex items-center gap-2">
                             <Input
                                type="number"
                                min={1}
                                max={5}
                                step={1}
                                {...register("stars", {
                                    valueAsNumber: true,
                                    min: 1,
                                    max: 5
                                })}
                             />
                             <Rating rating={watchedStars} showValue />
                           </div>
                           <FieldError>{errors.stars?.message}</FieldError>
                        </Field>
                        <Field>
                            <FieldLabel>Product Review Text</FieldLabel>
                            <Textarea required {...register("text")} />
                        </Field>
                        <Button className="h-12" type="submit">Add Review</Button>
                    </form>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}

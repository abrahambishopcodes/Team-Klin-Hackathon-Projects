import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"

import { simulateReview, type SimulateReviewResponse } from "@/api"
import { useMutation } from "@tanstack/react-query"
import { useReviewsStore } from "@/hooks/useReviewsStore"
import type { ReviewFormValues } from "./add-review-dialog"
import toast from "react-hot-toast"
import { useNavigate } from "react-router-dom"

export interface TargetProductFormValues {
  name: string
  category: string
  price: string
  description: string
}

const TargetProductCard = () => {
  const reviews = useReviewsStore((state) => state.reviews)
  const navigate = useNavigate()

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({
      reviews,
      targetProduct
    }: {
      reviews: ReviewFormValues[]
      targetProduct: TargetProductFormValues
    }) => simulateReview(reviews, targetProduct),
    onSuccess: (data: SimulateReviewResponse, variables) => {
      navigate("/simulate-review-result", {
        state: {
          result: data,
          targetProduct: variables.targetProduct
        }
      })
    }
  })

  const { register, formState, handleSubmit } = useForm<TargetProductFormValues>({
    defaultValues: {
      name: "",
      category: "",
      price: "",
      description: ""
    }
  })

  const errors = formState.errors

  const onSubmit = async (data: TargetProductFormValues) => {

    if (reviews.length < 4) {
      toast.error("Please add at least 4 reviews")
      return
    }

    await mutateAsync({
      reviews,
      targetProduct: data
    })
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-2xl font-bold">Target Product</CardTitle>
            <CardDescription className="text-lg text-foreground">
                What product should we run a simulation for?
            </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Field>
                    <FieldLabel className="field-label">Product Name</FieldLabel>
                    <Input
                      className="field-input"
                      placeholder="e.g iPhone 15 Pro Max"
                      {...register("name", { required: "Product name is required" })}
                    />
                    <FieldError>{errors.name?.message}</FieldError>
                </Field>
                <Field>
                    <FieldLabel className="field-label">Product Category</FieldLabel>
                    <Input
                      className="field-input"
                      placeholder="e.g Electronics"
                      {...register("category")}
                    />
                </Field>
                <Field>
                    <FieldLabel className="field-label">Product Price</FieldLabel>
                    <Input
                      className="field-input"
                      placeholder="e.g $1000"
                      {...register("price")}
                    />
                </Field>
                <Field>
                    <FieldLabel className="field-label">Product Description</FieldLabel>
                    <Textarea
                      className="field-input min-h-50"
                      placeholder="e.g A high-end smartphone with advanced features"
                      {...register("description")}
                    />
                </Field>

                <Button type="submit" disabled={isPending} className="w-full h-12 text-lg font-bold mt-4">
                    Simulate Review
                </Button>
            </form>
        </CardContent>
    </Card>
  )
}

export default TargetProductCard

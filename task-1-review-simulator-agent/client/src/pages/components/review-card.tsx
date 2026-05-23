import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rating } from "@/components/ui/rating"
import { X } from "lucide-react"
import { type ReviewFormValues } from "./add-review-dialog"
import { useReviewsStore } from "@/hooks/useReviewsStore"

const ReviewCard = ({review, index}: {review: ReviewFormValues, index: number}) => {
  const removeReview = useReviewsStore((state) => state.removeReview)
  return (
    <Card>
        <CardContent className="flex flex-col gap-4 relative" >
            <X className="absolute top-0 right-4 text-gray-400 size-5 hover:text-gray-200 cursor-pointer" onClick={() => removeReview(index)} />
            <div className="flex items-center gap-4">
                <p className="font-bold text-xl">{review.item}</p>
                <Badge className="bg-accent text-foreground text-sm font-mono rounded-sm py-3">{review.category}</Badge>
            </div>
            <Rating className="mt-4" rating={review.stars} showValue />
            <p className="mt-4 text-sm text-foreground">"{review.text}"</p>
        </CardContent>
    </Card>
  )
}

export default ReviewCard
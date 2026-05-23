import { Card, CardContent } from "@/components/ui/card"
import { type ReviewedProduct } from "../review-page"
import { Badge } from "@/components/ui/badge"
import { Rating } from "@/components/ui/rating"
import { X } from "lucide-react"

const ReviewCard = ({review}: {review: ReviewedProduct}) => {
  return (
    <Card>
        <CardContent className="flex flex-col gap-4 relative" >
            <X className="absolute top-0 right-4 text-gray-400 size-5 hover:text-gray-200" />
            <div className="flex items-center gap-4">
                <p className="font-bold text-xl">{review.title}</p>
                <Badge className="bg-accent text-foreground text-sm font-mono rounded-sm py-3">{review.category}</Badge>
            </div>
            <Rating className="mt-4" rating={review.rating} showValue />
            <p className="mt-4 text-sm text-foreground">"{review.review}"</p>
        </CardContent>
    </Card>
  )
}

export default ReviewCard
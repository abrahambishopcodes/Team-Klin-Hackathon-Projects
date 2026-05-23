import ReviewCard from "./components/review-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddReviewDialog } from "./components/add-review-dialog";
import TargetProductCard from "./components/target-product-card";
import { useReviewsStore } from "@/hooks/useReviewsStore";
import { LetterText } from "lucide-react";



const ReviewPage = () => {
  const reviews = useReviewsStore((state) => state.reviews)
  return (
    <section className="w-full h-full flex mt-10 gap-8">
      {/* Left side - Review history upload */}
      <div className="w-1/2">
        <h2>Reviewer History</h2>
        <p>Upload past reviews to teach the AI how this person thinks.</p>


        {/* Reviews */}
        <ScrollArea className="mt-8 h-full max-h-120 pr-4">
          <div className="flex flex-col gap-4">
            {reviews.length > 0 ? (reviews.map((review, i) => (
              <ReviewCard key={`${review.item}-${i}`} review={review} index={i} />
            ))) : (
              <div className="w-full h-full flex flex-col gap-4 items-center justify-center mt-10">
                <LetterText className="size-10" />
                <p className="text-lg">No reviews yet</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="w-full flex flex-col items-center mt-8 gap-4">
          <AddReviewDialog />

          <p className="text-lg">Add from 4 to 10 reviews for best results</p>
        </div>
      </div>

      {/* Right side - Target product */}
      <div className="w-1/2">
        <TargetProductCard />
      </div>
    </section>
  );
};

export default ReviewPage;

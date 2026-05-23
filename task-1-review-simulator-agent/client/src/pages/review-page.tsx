import ReviewCard from "./components/review-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddReviewDialog } from "./components/add-review-dialog";

export interface ReviewedProduct {
  title: string;
  rating: number;
  category: string;
  review: string;
}

const reviews: ReviewedProduct[] = [
  {
    title: "Product 1",
    rating: 5,
    category: "Category 1",
    review: "Review 1",
  },
  {
    title: "Product 2",
    rating: 4,
    category: "Category 2",
    review: "Review 2",
  },
  {
    title: "Product 3",
    rating: 3,
    category: "Category 3",
    review: "Review 3",
  },
  {
    title: "Product 4",
    rating: 2,
    category: "Category 4",
    review: "Review 4",
  },
  {
    title: "Product 5",
    rating: 1,
    category: "Category 5",
    review: "Review 5",
  },
];

const ReviewPage = () => {
  return (
    <section className="w-full h-full flex mt-10">
      {/* Left side - Review history upload */}
      <div className="w-1/2">
        <h2>Reviewer History</h2>
        <p>Upload past reviews to teach the AI how this person thinks.</p>


        {/* Reviews */}
        <ScrollArea className="mt-8 h-full max-h-120 pr-4">
          <div className="flex flex-col gap-4">
            {reviews.map((review, i) => (
              <ReviewCard key={`${review.title}-${i}`} review={review} />
            ))}
          </div>
        </ScrollArea>

        <div className="w-full flex flex-col items-center mt-8 gap-4">
          <AddReviewDialog />

          <p className="text-lg">Add from 4 to 10 reviews for best results</p>
        </div>
      </div>
    </section>
  );
};

export default ReviewPage;

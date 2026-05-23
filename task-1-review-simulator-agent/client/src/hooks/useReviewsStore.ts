import { create } from "zustand";
import { type ReviewFormValues } from "@/pages/components/add-review-dialog";

interface ReviewsState {
    reviews: ReviewFormValues[];
    addReview: (review: ReviewFormValues) => void;
}

export const useReviewsStore = create<ReviewsState>((set) => ({
    reviews: [],
    addReview: (review: ReviewFormValues) => set((state) => ({
        reviews: [...state.reviews, review]
    }))
}))
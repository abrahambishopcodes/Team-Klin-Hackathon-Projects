import { create } from "zustand";
import { type ReviewFormValues } from "@/pages/components/add-review-dialog";

interface ReviewsState {
    reviews: ReviewFormValues[];
    addReview: (review: ReviewFormValues) => void;
    setReviews: (reviews: ReviewFormValues[]) => void;
    removeReview: (index: number) => void;
    clearReviews: () => void;
}

export const useReviewsStore = create<ReviewsState>((set) => ({
    reviews: [],
    addReview: (review: ReviewFormValues) => set((state) => ({
        reviews: [...state.reviews, review]
    })),
    setReviews: (reviews: ReviewFormValues[]) => set(() => ({
        reviews
    })),
    removeReview: (index: number) => set((state) => ({
        reviews: state.reviews.filter((_, i) => i !== index)
    })),
    clearReviews: () => set(() => ({
        reviews: []
    }))
}))

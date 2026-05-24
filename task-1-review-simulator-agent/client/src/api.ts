import axios from "axios"
import type { ReviewFormValues } from "./pages/components/add-review-dialog"
import type { TargetProductFormValues } from "./pages/components/target-product-card"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
})

export interface SimulateReviewResponse {
    predicted_rating: number
    simulated_review: string
    confidence_score: number
    analysis: {
        cares_about: string
        five_star_trigger: string
        one_star_trigger: string
        personality: string
        writing_traits: string
        would_focus_on: string
        predicted_sentiment: string
    }
    reasoning: {
        similar_users_found: number
        category_match: boolean
        user_bias: number
        harshness: string
        style_detected: string
        avg_review_length: number
    }
}

export const simulateReview = async (reviews: ReviewFormValues[], targetProduct: TargetProductFormValues) => {
    const response = await api.post<SimulateReviewResponse>("/simulate", { user_history: reviews, target_item: targetProduct })
    return response.data
}

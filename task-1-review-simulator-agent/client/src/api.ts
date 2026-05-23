import axios from "axios"
import type { ReviewFormValues } from "./pages/components/add-review-dialog"
import type { TargetProductFormValues } from "./pages/components/target-product-card"

const api = axios.create({
    baseURL: "http://localhost:3000/api",
})

export const simulateReview = async (reviews: ReviewFormValues[], targetProduct: TargetProductFormValues) => {
    const response = await api.post("/simulate", { user_history: reviews, target_item: targetProduct })
    return response.data
}
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Rating } from "@/components/ui/rating"
import { Separator } from "@/components/ui/separator"
import type { SimulateReviewResponse } from "@/api"
import type { TargetProductFormValues } from "./components/target-product-card"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

type SimulationResultLocationState = {
  result: SimulateReviewResponse
  targetProduct: TargetProductFormValues
}

const SimulateReviewResultPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as SimulationResultLocationState | null

  if (!state?.result || !state?.targetProduct) {
    return <Navigate to="/" replace />
  }

  const { result, targetProduct } = state

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Simulation Result</p>
          <h1 className="text-3xl font-bold">{targetProduct.name}</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Generated Review</CardTitle>
            <CardDescription>
              Simulated response based on the reviewer history you provided.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {targetProduct.category ? (
                <Badge className="bg-accent text-foreground">{targetProduct.category}</Badge>
              ) : null}
              {targetProduct.price ? (
                <Badge variant="outline">{targetProduct.price}</Badge>
              ) : null}
              <Rating rating={result.predicted_rating} showValue />
            </div>

            {targetProduct.description ? (
              <p className="text-sm text-muted-foreground">{targetProduct.description}</p>
            ) : null}

            <Separator />

            <p className="whitespace-pre-wrap text-base leading-7">{result.simulated_review}</p>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{result.confidence_score}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reasoning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="font-semibold">Similar users:</span> {result.reasoning.similar_users_found}</p>
              <p><span className="font-semibold">Category match:</span> {result.reasoning.category_match ? "Yes" : "No"}</p>
              <p><span className="font-semibold">User bias:</span> {result.reasoning.user_bias}</p>
              <p><span className="font-semibold">Harshness:</span> {result.reasoning.harshness}</p>
              <p><span className="font-semibold">Style detected:</span> {result.reasoning.style_detected}</p>
              <p><span className="font-semibold">Avg review length:</span> {result.reasoning.avg_review_length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><span className="font-semibold">Cares about:</span> {result.analysis.cares_about}</p>
              <p><span className="font-semibold">Five-star trigger:</span> {result.analysis.five_star_trigger}</p>
              <p><span className="font-semibold">One-star trigger:</span> {result.analysis.one_star_trigger}</p>
              <p><span className="font-semibold">Personality:</span> {result.analysis.personality}</p>
              <p><span className="font-semibold">Writing traits:</span> {result.analysis.writing_traits}</p>
              <p><span className="font-semibold">Would focus on:</span> {result.analysis.would_focus_on}</p>
              <p><span className="font-semibold">Predicted sentiment:</span> {result.analysis.predicted_sentiment}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default SimulateReviewResultPage

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

const TargetProductCard = () => {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-2xl font-bold">Target Product</CardTitle>
            <CardDescription className="text-lg text-foreground">
                What product should we run a simulation for?
            </CardDescription>
        </CardHeader>
        <CardContent className="mt-8">
            <form className="space-y-4">
                <Field>
                    <FieldLabel className="field-label">Product Name</FieldLabel>
                    <Input className="field-input" placeholder="e.g iPhone 15 Pro Max" />
                </Field>
                <Field>
                    <FieldLabel className="field-label">Product Category</FieldLabel>
                    <Input className="field-input" placeholder="e.g Electronics" />
                </Field>
                <Field>
                    <FieldLabel className="field-label">Product Price</FieldLabel>
                    <Input className="field-input" placeholder="e.g $1000" />
                </Field>
                <Field>
                    <FieldLabel className="field-label">Product Description</FieldLabel>
                    <Textarea className="field-input min-h-50" placeholder="e.g A high-end smartphone with advanced features" />
                </Field>

                <Button className="w-full h-12 text-lg font-bold mt-4">
                    Simulate Review
                </Button>
            </form>
        </CardContent>
    </Card>
  )
}

export default TargetProductCard
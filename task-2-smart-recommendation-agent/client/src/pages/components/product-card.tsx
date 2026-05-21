import { type Product } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

const ProductCard = ({
  product,
  index,
}: {
  product: Product;
  index: number;
}) => {
  return (
    <Card className="max-w-lg border-border">
      <CardContent className="flex flex-col gap-4">
        <p className="font-mono">{(index + 1).toString().padStart(2, "0")}</p>

        <div className="flex flex-col gap-4">
          <p className="font-bold">{product.title}</p>

        {/* product category and ratings */}
          <div className="flex items-center gap-2">
            <Badge className="p-3" variant="outline">{product.main_category}</Badge>
            <div className="flex items-center gap-1">
              <Star className="size-4 text-yellow-500" />
              <p>{product.average_rating}</p>
            </div>
          </div>

          {/* product price */}
          <p className="text-lg font-bold">${Number(product.price) || "N/A"}</p>
        </div>

        {/*  */}
        <div className="bg-secondary p-4 rounded-lg">
            <p className="font-mono text-xs text-primary mb-2">WHY RECO RECOMMEDED THIS</p>
            <p>{product.reasoning}</p>
        </div>

      </CardContent>
    </Card>
  );
};

export default ProductCard;

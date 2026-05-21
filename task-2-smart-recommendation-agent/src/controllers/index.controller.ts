import { Request, Response } from "express";
import { index } from "../config/pinecone.config";
import voyage from "../config/voyage.config";
import prisma from "../lib/prisma.lib";
import {
  aiRecommendProducts,
  generateQuery,
  RerankedProduct,
  UserPersona,
} from "../utils/aiHelpers";

import { RerankResponseDataItem } from "voyageai";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";

interface ProductFields {
  title?: string;
  description?: string | string[];
  features?: string | string[];
  parent_asin?: string;
  main_category?: string;
  price?: string;
  average_rating?: number;
  rating_number?: number;
}

interface SearchHit {
  fields: ProductFields;
}

// * Controller to recommend products to user
export const recommendProductsController = async (
  req: Request,
  res: Response,
) => {
  const { user_query, user_id, cold_start, user_persona } = req.body;

  let user = null;

  if (cold_start) {
    // perform cold start actions
  } else {
    // Fetch user from database
    user = await prisma.user.findUnique({
      where: {
        user_id,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }
  }

  //   get the user persona based on whether the message is cold_start or not
  const persona = cold_start
    ? user_persona
    : (user?.persona_summary as unknown as UserPersona);


  if (!persona) {
    throw new Error("User persona is required");
  }

  // * use the llm to generate a query based on the user's query and their profile
  const generatedQuery = await generateQuery(persona, user_query);

  if (!generatedQuery) {
    throw new Error("Failed to generate query");
  }

  // embedded the user query
  const embeddingResponse = await voyage.embed({
    model: "voyage-4-lite",
    input: generatedQuery,
    inputType: "query",
  });

  const vector = embeddingResponse?.data?.[0]?.embedding;

  if (!vector) {
    throw new Error("Failed to generate embedding");
  }

  // used the vector to query the pinecone index and rerank the results
  const productsRecommendations = await index.searchRecords({
    query: {
      vector: { values: vector },
      topK: 25,
    },
    namespace: "task2_items",
  });

  // We reconstruct the document fields to be used for reranking
  const documents = (
    (productsRecommendations.result?.hits as unknown as SearchHit[]) || []
  )
    ?.map((hit) => {
      const fields = hit.fields;
      if (!fields) return "";

      const title = fields.title || "";
      const description = Array.isArray(fields.description)
        ? fields.description.join(" ")
        : fields.description || "";
      const features = Array.isArray(fields.features)
        ? fields.features.join(" ")
        : fields.features || "";

      return `${title}. ${description} ${features}`.trim();
    })
    .filter((doc: string) => doc !== "");

  // rerank the documents results
  const reRankedResults = await voyage.rerank({
    query: generatedQuery,
    documents: documents,
    model: "rerank-2.5-lite",
    topK: 10,
  });

  // get the original documents from the ranked results index
  const reRankedProducts = reRankedResults.data?.map(
    (result: RerankResponseDataItem) => {
      const originalIndex = result.index as number;
      const originalDocument = (
        productsRecommendations.result?.hits as unknown as SearchHit[]
      )?.[originalIndex];

      return {
        confidenceScore: result.relevanceScore,
        product: originalDocument?.fields,
      };
    },
  );

  // use the llm to recommend final products from the reranked results and reason on why it is recommending the product
  const aiProductRecommendationResponse = await aiRecommendProducts(
    persona,
    user_query,
    reRankedProducts as RerankedProduct[],
  );

  const recommendedProducts = JSON.parse(
    aiProductRecommendationResponse.response?.content as string,
  );

  // return the products with the reasoning from the llm
  const finalResults = recommendedProducts.products_asins.map((r: any) => {
    const product = reRankedProducts?.find(
      (p) => p?.product?.parent_asin === r.asin,
    );
    return {
      ...product,
      reasoning: r.reasoning,
    };
  });

  sendSuccessResponse(res, 200, "Recommendations fetched successfully", {
    interpretedQuery: generatedQuery,
    products: {
      ...finalResults,
      main_reasoning: recommendedProducts.main_reasoning,
    },
    tokenUsage: aiProductRecommendationResponse.usage,
  });
};

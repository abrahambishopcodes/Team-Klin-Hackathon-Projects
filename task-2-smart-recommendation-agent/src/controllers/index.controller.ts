import { Request, Response } from "express";
import { index } from "../config/pinecone.config";
import voyage from "../config/voyage.config";
import prisma from "../lib/prisma.lib";
import {
  aiRecommendProducts,
  ColdStartUserPersona,
  extractProfileFromColdStatusText,
  generateQuery,
  RerankedProduct,
  rewriteColdStartQuery,
  UserPersona,
} from "../utils/aiHelpers";

import { RerankResponseDataItem } from "voyageai";
import { sendSuccessResponse } from "../utils/apiResponseHelpers";

import AppError from "../utils/AppError";

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

  // if the user is not cold_start, fetch the user from the database
  if (!cold_start) {
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
  const persona = user_persona || (user?.persona_summary);

  if (!persona) {
    throw new AppError("User persona is required", 400);
  }

  // generate query based on whether the message is cold_start or not
  let generatedQuery = null;
  if (cold_start) {
    generatedQuery = await rewriteColdStartQuery(persona as ColdStartUserPersona, user_query);
  } else {
    generatedQuery = await generateQuery(persona as UserPersona, user_query);
  }

  if (!generatedQuery) {
    throw new AppError("Failed to generate query", 400);
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
    cold_start,
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
      ...product?.product,
      reasoning: r.reasoning,
    };
  });

  sendSuccessResponse(res, 200, "Recommendations fetched successfully", {
    interpretedQuery: generatedQuery,
    products: finalResults,
    main_reasoning: recommendedProducts.main_reasoning,
    tokenUsage: aiProductRecommendationResponse.usage,
  });
};

// * Controller to generate a structured and detailed user_persona based on the user's cold status text
export const generateColdUserPersonaController = async (req: Request, res: Response) => {
  const { personaText } = req.body;

  if (!personaText) {
    throw new AppError("Persona text is required", 400);
  }

  const persona = await extractProfileFromColdStatusText(personaText);

  sendSuccessResponse(res, 200, "Persona generated successfully", JSON.parse(persona as string));
}
import groq from "../config/groq.config";

export const generateQuery = async (
  user_persona: string,
  userQuery: string,
) => {
  const queryResponse = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: `
        You are an expert in generating queries for a vector database to retrieve relevant information. return just the query alone, do not add any extra texts or formatings.
        You are to generate a query in natural language based on the user's original query and their profile.
                
                User query: ${userQuery}
                User profile: ${JSON.stringify(user_persona)}
                
                Generate a query that will help retrieve relevant information from the vector database.`,
      },
    ],
  });

  return queryResponse?.choices?.[0]?.message?.content;
};

// * LLM to recommend final products from the reranked results and reason on why it is recommending the product

export const aiRecommendProducts = async (
  user_persona: object,
  userQuery: string,
  rerankedResults: any[],
) => {

  // transform and compress the reranked results to fit the llm context window
  const products = rerankedResults.map((result: any) => {
    const product = result.product;

    return {
  asin: product.parent_asin,
  title: product.title?.substring(0, 80),
  category: product.main_category,
  price: product.price === "None" ? null : product.price,
  rating: product.average_rating,
  rating_count: product.rating_number,
  summary: product.description?.[1]?.substring(0, 150) ?? "",
  key_features: product.features
    ?.slice(0, 2)
    .map((f: string) => f.substring(0, 100)) ?? [],
}
  });

  const recommendedProducts = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    include_reasoning: true,
    max_completion_tokens: 2000,
    reasoning_effort: "medium",
    temperature: 0.6,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "recommendations",
        schema: {
          type: "object",
          properties: {
            products_asins: {
              type: "array",
              description: "List of product ASINs to be recommended",
              items: {
                type: "object",
                properties: {
                  asin: {
                    type: "string",
                  },
                  confidence_score: {
                    type: "number",
                  },
                },
                required: ["asin", "confidence_score"],
              },
            },
          },
          required: ["products_asins"],
        }
      }
    },
    messages: [
      {
        role: "system",
        content: `You are a product recommendation agent. Before making any recommendation, 
        you must reason carefully through the following steps in order.
        Do not skip any step. Do not rush to conclusions. Reference actual profile signals
        in every decision.
`
      },
      {
        role: "user",
        content: `
        === USER PERSONA ===
        ${user_persona}

        === USER QUERY ===
        ${userQuery}

        === PRODUCTS ===
        ${JSON.stringify(products)}

        === HOW TO REASON ===
        STEP 1 — DECODE AND UNDERSTAND THE USER
Look at their profile. Ask yourself:
- what are they looking for and what do they punish?
- What is their actual price ceiling?
- Do they have any cross-category interests outside their primary domain?
Write your analysis before moving on.

        
STEP 2 — INTERPRET THE QUERY WITH CONTEXT
Do not take the query literally. Ask yourself:
- Given this specific user's profile, what do they ACTUALLY mean?

STEP 3 — SCORE EACH CANDIDATE
For every candidate evaluate:
- Relevance to the interpreted query (not the literal query)
- Alignment with price sensitivity from their history
- Match to their quality signals
- Cross-domain value (does it expand their interests in a relevant way?)
- Risk factors (what about this product might they dislike based on history?)
Give each candidate a score from 1-10 with specific justification.
Do not give scores without reasons.

STEP 4 — IDENTIFY COVERAGE GAPS
Is there a gap between what the user wants and what is available?
If yes, what is the closest available alternative and why is it still valuable?
Be honest about limitations. Do not pretend a weak match is strong.

STEP 5 — RANK AND JUSTIFY
Select your top 10. Order matters — your rank 1 must be your strongest 
match, not just a good match. Each recommendation must reference specific 
signals from the user's profile, not generic reasons.

Bad reason: "This matches your interests"
Good reason: "You rated 3 health monitors 4+ stars and mentioned 
              battery life in all positive reviews. This device has 
              a 14-day battery and is your price range."

        `.trim(),
      },
    ],
  });

  return {
    usage: recommendedProducts.usage,
    response: recommendedProducts?.choices?.[0]?.message
  };
};

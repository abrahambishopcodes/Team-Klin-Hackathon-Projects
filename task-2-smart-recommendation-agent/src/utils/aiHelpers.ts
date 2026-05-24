import groq from "../config/groq.config";

export interface UserPersona {
  quality_bar: string;
  brand_signals: string[];
  taste_summary: string;
  purchase_drivers: string[];
  recent_purchases: string[];
  price_sensitivity: string;
  preferred_categories: string[];
  price_range_estimate: string;
  review_tone_patterns: string;
  typical_dealbreakers: string[];
}

export interface ColdStartUserPersona extends UserPersona {
  cold_start: boolean;
  cold_start_confidence: string;
  inference_notes: string;
}


export interface RerankedProduct {
  confidenceScore: number;
  product: any;
}

//  * use the llm to generate a query based on the user's query and their profile - For existing users

export const generateQuery = async (
  user_persona: UserPersona,
  userQuery: string,
) => {
  const queryResponse = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `
        You are an expert at rewriting shopping queries for vector retrieval over a product catalog.
        Your job is to generate one natural-language retrieval query based on the user's original query and their persona.

        Rules:
        - Return only the query text. No labels, no quotes, no markdown, no explanation.
        - Preserve the user's main product intent and any explicit hard constraints.
        - Use persona signals to sharpen the query: budget level, quality expectations, preferred categories, brand signals, purchase drivers, and dealbreakers.
        - If the persona suggests adjacent cross-domain interests that are genuinely relevant, you may include them only when they strengthen retrieval for the user's request.
        - Do not invent constraints, brands, specs, or use cases that are not stated or clearly supported by the persona.
        - Prefer concrete product attributes that help retrieval: category, use case, quality level, price band, key features, and style/taste signals.
        - Keep the query compact but specific. One sentence only.`
      },
      {
        role: "user",
        content: `
        User query: ${userQuery}
        User profile: ${JSON.stringify(user_persona)}
        
        Generate a single retrieval query that will help fetch the most relevant products from the vector database.`,
      },
    ],
  });

  return queryResponse?.choices?.[0]?.message?.content;
};

// * use the llm to generate a query based on the user's query and their profile - For cold start users
export const rewriteColdStartQuery = async (
  userPersona: ColdStartUserPersona,
  userQuery: string,
) => {

 const queryResponse = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    {
      role: "system",
      content: `
You rewrite shopping queries for vector retrieval over a product catalog.

Rules:
- Return only the rewritten query as plain text. No preamble, no quotes, no markdown.
- Keep the user's main intent intact.
- Because this is a cold-start user, use only the preferences provided. Do not rely on purchase history.
- Preserve explicit hard constraints from the original query.
- If confidence is low, stay very close to the user's wording and only add clearly supported detail.
- If confidence is medium or high, enrich the query with supported preference signals such as budget, quality level, style, preferred categories, and dealbreakers.
- Only add cross-domain signals when they are clearly relevant and improve retrieval for the stated request.
- Do not invent brands, specifications, or needs that are not stated or strongly implied.
- Keep the rewrite compact and retrieval-friendly. One sentence only.`
    },
    {
      role: "user",
      content: `
Rewrite this product search query to be more specific and useful for retrieval.

The user is new — we have no purchase history. 
Base the rewrite only on their described preferences.

User preferences:
${JSON.stringify(userPersona)}

Original query: "${userQuery}"

If confidence is low, keep the rewrite close to the original query.
If confidence is medium or high, enrich it with supported signals only.

Generate a single rewritten query that will help retrieve the most relevant products from the vector database.
  `.trim()
    }
  ]
 })

 return queryResponse.choices[0]?.message.content;

};

// * LLM to extract profile from cold status text
export const extractProfileFromColdStatusText = async (personaText: string) => {
  const profileResponse = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "user_persona",
        schema: {
          type: "object",
          properties: {
            price_sensitivity: {
              type: "string",
            },
            price_range_estimate: {
              type: "string",
            },
            preferred_categories: {
              type: "array",
              items: {
                type: "string",
              },
            },
            purchase_drivers: {
              type: "array",
              items: {
                type: "string",
              },
            },
            brand_signals: {
              type: "array",
              items: {
                type: "string",
              },
            },
            quality_bar: {
              type: "string",
            },
            typical_dealbreakers: {
              type: "array",
              items: {
                type: "string",
              },
            },
            taste_summary: {
              type: "string",
            },
            review_tone_patterns: {
              type: "string",
            },
            recent_purchases: {
              type: "array",
              items: {
                type: "string",
              },
            },
            cold_start: {
              type: "boolean",
            },
            cold_start_confidence: {
              type: "string",
            },
            inference_notes: {
              type: "string",
            },
          },
          required: [
            "price_sensitivity",
            "price_range_estimate",
            "preferred_categories",
            "purchase_drivers",
            "brand_signals",
            "quality_bar",
            "typical_dealbreakers",
            "taste_summary",
            "review_tone_patterns",
            "recent_purchases",
            "cold_start",
            "cold_start_confidence",
            "inference_notes",
          ],
        }
      }
    },
    messages: [
      {
        role: "system",
        content: `You are a user profiling agent. A new user with no purchase history 
has described themselves. Extract their taste profile from this description alone.

USER DESCRIPTION:
"${personaText}"

Guidelines per field:
- price_sensitivity: "budget" | "mid-range" | "premium" | "unknown"
- price_range_estimate: concrete range like "$20-$60" or "unknown"
- preferred_categories: only categories explicitly mentioned or strongly implied
- purchase_drivers: what they value — infer from adjectives they use
- brand_signals: only brands they actually mention
- quality_bar: one sentence on what quality means to this person
- typical_dealbreakers: only if they mention things they dislike
- taste_summary: 2 sentences summarising who this person is as a buyer
- cold_start_confidence: "low" | "medium" | "high"
  low = vague description, few signals
  medium = some clear signals, some gaps
  high = rich description, many clear signals
- inference_notes: 1 sentence on what you could NOT determine and why

`
      },
      {
        role: "user",
        content: `
        Be conservative — only extract what is genuinely stated or clearly implied.
Do not invent signals that are not present in the description.
If something is unclear, reflect that uncertainty in the output.
        `,
      },
    ],
  });

  return profileResponse?.choices?.[0]?.message?.content;
}

// * LLM to recommend final products from the reranked results and reason on why it is recommending the product

export const aiRecommendProducts = async (
  user_persona: any,
  userQuery: string,
  rerankedResults: RerankedProduct[],
  cold_start: boolean,
) => {

  const coldStartInstructions = cold_start ? `
  === NOTE THIS VERY IMPORANT INSTRUCTION === 
IMPORTANT — COLD START USER:
This user has no purchase history. Their profile was inferred entirely 
from a text description. Confidence level: ${user_persona.cold_start_confidence}.

Inference gaps: ${user_persona.inference_notes}

Adjust your recommendations accordingly:
- If confidence is LOW: stay close to the literal query, avoid assumptions
- If confidence is MEDIUM: apply clear signals, be cautious on implied ones  
- If confidence is HIGH: apply full profile signals as you would for existing user
- Be transparent in reasoning_summary that this is a cold start recommendation
` : ""

  // compress the user persona to fit the llm context window
  const compressUserPersona = (persona: UserPersona): string => {
    return Object.entries(persona)
      .map(([key, value]) => {
        const formattedKey = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
        const formattedValue = Array.isArray(value) ? value.join(", ") : value;
        return `${formattedKey}: ${formattedValue}`;
      })
      .join("\n");
  };

  const formattedPersona = compressUserPersona(user_persona);

  // transform and compress the reranked results to fit the llm context window
  const products = rerankedResults.map((result: RerankedProduct) => {
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
    };
  });

  const recommendedProducts = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    max_completion_tokens: 2000,
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
                  reasoning: {
                    type: "string",
                    description: "short reasoning for the recommendation."
                  }
                },
                required: ["asin", "confidence_score", "reasoning"],
              },
            },
            main_reasoning: {
              type: "string",
              description: "comprehensive detailed reasoning for the recommendations."
            }
          },
          required: ["products_asins", "main_reasoning"],
        }
      }
    },
    messages: [
      {
        role: "system",
        content: `You are a product recommendation agent who deeply understands the user's needs and preferences. Before making any recommendation, 
        you must reason carefully through the following steps in order.
        Do not skip any step. Do not rush to conclusions. Reference actual profile signals
        in every decision. Respond like you understand and is talking directly to the user using pronouns like 'you'.
        Recommend only products from the provided candidate list.
        Your final output must contain only 5 to 8 products, no more and no fewer than needed within that range.`
      },
      {
        role: "user",
        content: `
        === USER PERSONA ===
        ${formattedPersona}

        === USER QUERY ===
        ${userQuery}

        === PRODUCTS ===
        ${JSON.stringify(products)}

        ${coldStartInstructions}

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
- Is there a relevant cross-domain angle suggested by their persona that still fits this request?

Cross-domain guidance:
- You may recommend adjacent-category products when they clearly fit the user's taste, use case, and purchase drivers.
- Cross-domain does not mean random exploration. It must still be a strong answer to the user's current request.
- Prefer direct matches first. Use adjacent-category recommendations only when they add clear value or solve the request better.

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
Select your final 5 to 8 products. Order matters — your rank 1 must be your strongest 
match, not just a good match. Each recommendation must reference specific 
signals from the user's profile, not generic reasons.

Bad reason: "This matches your interests"
Good reason: "You rated 3 health monitors 4+ stars and mentioned 
              battery life in all positive reviews. This device has 
              a 14-day battery and is your price range."

              RECOMMEND ONLY 5 TO 8 PRODUCTS THAT BEST FIT THE USER'S NEEDS AND PREFERENCES

        `.trim(),
      },
    ],
  });

  return {
    usage: recommendedProducts.usage,
    response: recommendedProducts?.choices?.[0]?.message
  };
};

import "dotenv/config";

import fs from "fs";
import path from "path";
import readline from "readline";
import { prisma } from "../lib/prisma.lib";
import openaiClient from "../config/openai.config";
import getEnv from "../utils/env";

const DATA_DIR = path.join(__dirname, "../../data/raw");
const REVIEWS_FILES = [
  "Electronics_reviews.jsonl",
  "Grocery_reviews.jsonl",
  "Health_reviews.jsonl",
];

interface RawReview {
  user_id: string;
  asin: string;
  rating: number;
  text: string;
  title: string;
  verified_purchase: boolean;
  timestamp: number;
}

async function processUsers() {
  const userReviewsMap = new Map<string, RawReview[]>();

  console.log("Reading raw review files...");
  for (const file of REVIEWS_FILES) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      continue;
    }

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const review: RawReview = JSON.parse(line);
      const reviews = userReviewsMap.get(review.user_id) || [];
      reviews.push(review);
      userReviewsMap.set(review.user_id, reviews);
    }
  }

  const qualifiedUsers = Array.from(userReviewsMap.entries()).filter(
    ([_, reviews]) => reviews.length >= 8 && reviews.length <= 12,
  );

  console.log(`Found ${qualifiedUsers.length} qualified users (8-12 reviews).`);

  //  process 6 users
  const usersToProcess = qualifiedUsers.slice(0, 6);

  for (const [userId, reviews] of usersToProcess) {
    console.log(`Processing user: ${userId} with ${reviews.length} reviews...`);

    const avgRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const avgTextLength =
      reviews.reduce((sum, r) => sum + r.text.length, 0) / reviews.length;

    const personaSummary = await generatePersonaSummary(reviews);

    try {
      await prisma.user.upsert({
        where: { user_id: userId },
        update: {
          rating_count: reviews.length,
          avg_rating: avgRating,
          avg_rating_text_length: avgTextLength,
          persona_summary: personaSummary as any,
        },
        create: {
          user_id: userId,
          rating_count: reviews.length,
          avg_rating: avgRating,
          avg_rating_text_length: avgTextLength,
          persona_summary: personaSummary as any,
        },
      });

      for (const r of reviews) {
        await prisma.review.create({
          data: {
            user_id: userId,
            asin: r.asin,
            rating: r.rating,
            review_text: r.text,
            review_title: r.title,
            verified_purchase: r.verified_purchase,
            reviewed_at: new Date(r.timestamp),
          },
        });
      }
      console.log(`Successfully processed user ${userId}`);
    } catch (error) {
      console.error(`Error saving user ${userId} to database:`, error);
    }
  }

  console.log("Finished processing users.");
}

async function generatePersonaSummary(reviews: RawReview[]) {
  const reviewsContent = reviews
    .map(
      (r, i) =>
        `Review ${i + 1}: [Rating: ${r.rating}] [Title: ${r.title}] Content: ${r.text}`,
    )
    .join("\n\n");

  const prompt = `
Analyze the following product reviews from a single user and generate a rich, accurate persona summary in JSON format.

The JSON should include:
- preferred_categories: string[]
- price_sensitivity: string (e.g., "High", "Medium", "Low" with brief reasoning)
- quality_bar: string (what they look for in products)
- brand_signals: string[] (notable brands or types of brands they favor)
- review_tone_patterns: string (e.g., "Analytical", "Emotional", "Critical", "Brief")
- typical_dealbreakers: string[]
- purchase_drivers: string[]
- taste_summary: string (2 to 3 sentence summary of the user's taste)

User Reviews:
${reviewsContent}

Return ONLY the JSON object.
`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: getEnv("AI_BASE_MODEL"),
      messages: [
        {
          role: "system",
          content: "You are an expert user behaviour analyst. Analyze the following review history and extract a structured taste profile.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : {};
  } catch (error) {
    console.error("Error generating persona summary with LLM:", error);
    return {};
  }
}

processUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

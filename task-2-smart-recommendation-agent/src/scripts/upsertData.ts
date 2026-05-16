import "dotenv/config";

import fs from "fs";
import path from "path";
import readline from "readline";

import { Pinecone, RecordMetadata } from "@pinecone-database/pinecone";
import { VoyageAIClient } from "voyageai";

import getEnv from "../utils/env";

// ======================================================
// TYPES
// ======================================================

interface ItemData {
  parent_asin: string;
  title: string;
  description: string[];
  main_category: string;
  features: string[];
  average_rating: number;
  rating_number: number;
  price: "None" | string;
  store: string;
}

interface UserData {
  user_id: string;
  asin: string;
  rating: number;
  text: string;
  title: string;
  verified_purchase: boolean;
  timestamp: number;
}

type FileType = "item" | "user";

// ======================================================
// CONSTANTS
// ======================================================

const VOYAGE_BATCH_SIZE = 50; // Increased batch size for better efficiency
const PINECONE_BATCH_SIZE = 50;

const EMBEDDING_MODEL = "voyage-4-lite";

// delay between requests to reduce rate-limit chances
const VOYAGE_DELAY_MS = 1200;
const PINECONE_DELAY_MS = 500;

// ======================================================
// CLIENTS
// ======================================================

const pinecone = new Pinecone({
  apiKey: getEnv("PINECONE_API_KEY"),
});

const index = pinecone.index({name: getEnv("PINECONE_INDEX_NAME")});

const voyage = new VoyageAIClient({
  apiKey: getEnv("VOYAGE_API_KEY"),
});

// ======================================================
// HELPERS
// ======================================================

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const sanitizeMetadata = (metadata: Record<string, unknown>): RecordMetadata => {
  // Pinecone metadata values must be:
  // string | number | boolean | string[]

  const sanitized: RecordMetadata = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((v) => String(v));
    } else if (value === null || value === undefined) {
      continue;
    } else {
      sanitized[key] = JSON.stringify(value);
    }
  }

  return sanitized;
};

// ======================================================
// EMBEDDING TEXT BUILDERS
// ======================================================

const buildItemEmbeddingText = (item: ItemData): string => {
  const title = item.title ?? "";
  const description = Array.isArray(item.description)
    ? item.description.join(" ")
    : "";
  const features = Array.isArray(item.features)
    ? item.features.join(" ")
    : "";

  const combined = `
   ${title}. ${description} ${features}
  `;

  return combined.trim();
};

const buildUserEmbeddingText = (user: UserData): string => {
  return user.text ? user.text.trim() : "";
};

// ======================================================
// METADATA BUILDERS
// ======================================================

const buildItemMetadata = (item: ItemData) => {
  return sanitizeMetadata({
    parent_asin: item.parent_asin,
    title: item.title,
    description: item.description,
    main_category: item.main_category,
    features: item.features,
    average_rating: item.average_rating,
    rating_number: item.rating_number,
    price: item.price,
    store: item.store,
  });
};

const buildUserMetadata = (user: UserData) => {
  return sanitizeMetadata({
    user_id: user.user_id,
    asin: user.asin,
    rating: user.rating,
    text: user.text,
    title: user.title,
    verified_purchase: user.verified_purchase,
    timestamp: user.timestamp,
  });
};

// ======================================================
// FILE READER
// ======================================================

const readJsonlFile = async (
  filePath: string,
  fileType: FileType
): Promise<(ItemData | UserData)[]> => {
  const parsedLines: (ItemData | UserData)[] = [];

  const readStream = fs.createReadStream(filePath, {
    encoding: "utf-8",
  });

  const rl = readline.createInterface({
    input: readStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    try {
      const parsedData = JSON.parse(trimmedLine);

      // --------------------------------------------------
      // ITEM VALIDATION
      // --------------------------------------------------

      if (fileType === "item") {
        const item = parsedData as ItemData;

        const hasUsefulData =
          item.parent_asin &&
          item.title &&
          item.description;

        if (!hasUsefulData) {
          continue;
        }

        parsedLines.push(item);
      }

      // --------------------------------------------------
      // USER VALIDATION
      // --------------------------------------------------

      if (fileType === "user") {
        const user = parsedData as UserData;

        if (!user.text || user.text.trim() === "") {
          continue;
        }

        parsedLines.push(user);
      }
    } catch (error) {
      console.error("Failed to parse line:", error);
    }
  }

  return parsedLines;
};

// ======================================================
// UPSERT PROCESSOR
// ======================================================

const processFile = async (
  filePath: string,
  fileType: FileType
): Promise<void> => {
  const namespace =
    fileType === "item"
      ? "task2_items"
      : "task2_users";

  console.log(`Reading ${fileType} file...`);

  const parsedLines = await readJsonlFile(filePath, fileType);

  console.log(
    `Loaded ${parsedLines.length} ${fileType} records from ${path.basename(filePath)}`
  );

  let pineconeRecords: {
    id: string;
    values: number[];
    metadata: RecordMetadata;
  }[] = [];

  let upsertedCount = 0;

  // ====================================================
  // INCREMENTAL EMBEDDING & UPSERT LOOP
  // ====================================================

  for (let i = 0; i < parsedLines.length; i += VOYAGE_BATCH_SIZE) {
    const chunk = parsedLines.slice(i, i + VOYAGE_BATCH_SIZE);

    const textsToEmbed = chunk.map((data) => {
      if (fileType === "item") {
        return buildItemEmbeddingText(data as ItemData);
      }
      return buildUserEmbeddingText(data as UserData);
    });

    try {
      process.stdout.write(`\rEmbedding batch ${Math.floor(i / VOYAGE_BATCH_SIZE) + 1} of ${Math.ceil(parsedLines.length / VOYAGE_BATCH_SIZE)}...`);

      const embeddingResponse = await voyage.embed({
        model: EMBEDDING_MODEL,
        input: textsToEmbed,
      });

      const embeddings = embeddingResponse.data ?? [];

      for (let j = 0; j < chunk.length; j++) {
        const currentData = chunk[j];
        const embedding = embeddings[j];

        if (!embedding) continue;

        if (fileType === "item") {
          const item = currentData as ItemData;
          pineconeRecords.push({
            id: item.parent_asin,
            values: embedding.embedding ?? [],
            metadata: buildItemMetadata(item),
          });
        }

        if (fileType === "user") {
          const user = currentData as UserData;
          pineconeRecords.push({
            id: `${user.user_id}_${user.asin}_${user.timestamp}`,
            values: embedding.embedding ?? [],
            metadata: buildUserMetadata(user),
          });
        }
      }

      // Upsert to Pinecone if we reached the batch size
      while (pineconeRecords.length >= PINECONE_BATCH_SIZE) {
        const upsertChunk = pineconeRecords.slice(0, PINECONE_BATCH_SIZE);
        pineconeRecords = pineconeRecords.slice(PINECONE_BATCH_SIZE);

        try {
          process.stdout.write(`\nUpserting ${upsertChunk.length} records to Pinecone...\n`);
          await index.namespace(namespace).upsert({ records: upsertChunk });
          upsertedCount += upsertChunk.length;
          await sleep(PINECONE_DELAY_MS);
        } catch (error) {
          console.error(`\nError upserting Pinecone batch:`, error);
        }
      }

      // small delay for rate limiting
      await sleep(VOYAGE_DELAY_MS);
    } catch (error) {
      console.error(`\nError embedding batch starting at ${i}:`, error);
    }
  }

  // Upsert any remaining records
  if (pineconeRecords.length > 0) {
    try {
      process.stdout.write(`\nUpserting final ${pineconeRecords.length} records to Pinecone...\n`);
      await index.namespace(namespace).upsert({ records: pineconeRecords });
      upsertedCount += pineconeRecords.length;
      await sleep(PINECONE_DELAY_MS);
    } catch (error) {
      console.error(`\nError upserting final Pinecone batch:`, error);
    }
  }

  console.log(`\nFinished processing ${path.basename(filePath)}. Total upserted: ${upsertedCount}\n`);
};

// ======================================================
// MAIN EXECUTION
// ======================================================

const executeDataUpsert = async (): Promise<void> => {
  try {
    const dir = path.join(
      __dirname,
      "../../data/raw"
    );

    const files = fs.readdirSync(dir);

    if (!files || files.length === 0) {
      throw new Error(
        "No files found in the data directory"
      );
    }

    console.log(
      `Found ${files.length} files to process`
    );

    // sequential processing is safer for rate limits
    for (const file of files) {
      const filePath = path.join(dir, file);

      const fileType: FileType = file.includes("meta")
        ? "item"
        : "user";

      console.log("\n==================================");
      console.log(
        `Processing ${fileType} file: ${file}`
      );
      console.log("==================================\n");

      await processFile(filePath, fileType);
    }

    console.log("All files processed successfully");
  } catch (error) {
    console.error("Fatal execution error:", error);
  }
};

executeDataUpsert();
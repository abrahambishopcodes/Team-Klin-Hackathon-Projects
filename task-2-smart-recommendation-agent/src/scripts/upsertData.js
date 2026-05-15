const { Pinecone } = require("@pinecone-database/pinecone");
const fs = require("fs");
const readline = require("readline");
const path = require("path");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pc.Index({
  name: process.env.PINECONE_INDEX_NAME,
});

const processFile = async (filePath, namespace, type) => {
  console.log(`\nProcessing ${type} file: ${path.basename(filePath)}`);
  
  const readFileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: readFileStream,
    crlfDelay: Infinity
  });

  let batch = [];
  const BATCH_SIZE = 25; 

  for await (const line of rl) {
    if (!line.trim()) continue;
    
    try {
      const data = JSON.parse(line);
      
      const record = type === "item" 
        ? {
            id: `item_${data.parent_asin || data.asin}`,
            chunk_text: `${data.title}. ${data.description?.join(' ')}. ${data.features?.join(' ')}` || '',
            title: data.title || "Unknown Title",
            category: data.main_category || "General",
            price: data.price === "None" || !data.price ? 0 : Number(data.price),
            avg_rating: Number(data.average_rating) || 0,
            store: data.store || "Unknown Store",
          }
        : {
            id: `rev_${data.user_id}_${data.asin}_${Date.now()}`,
            chunk_text: data.text || "",
            user_id: String(data.user_id || ""),
            rating: Number(data.rating) || 0,
            asin: String(data.asin || ""),
            verified_purchase: Boolean(data.verified_purchase),
          };

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        await index.upsertRecords({
          records: batch,
          namespace: namespace
        });
        process.stdout.write("."); // Progress marker
        batch = [];
      }
    } catch (parseErr) {
      console.error(`\nError parsing line in ${filePath}:`, parseErr.message);
    }
  }

  // Upload final remaining records
  if (batch.length > 0) {
    await index.upsertRecords({ records: batch, namespace: namespace });
  }
  console.log(`\nFinished upserting to ${namespace}`);
};

/**
 * Main Orchestrator
 */
const executeUpsertDataScript = async () => {
  
  const dataDir = path.join(__dirname, "../", "../", "/data/raw");
  
  try {
    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found at: ${dataDir}`);
    }

    const files = fs.readdirSync(dataDir);
    console.log(`Found ${files.length} files in data/raw`);

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const isMeta = file.includes("meta");
      const type = isMeta ? "item" : "user";
      
      const namespace = isMeta ? "task2_items" : "task2_users"; 
      
      const filePath = path.join(dataDir, file);
      
      await processFile(filePath, namespace, type);
    }
    
    console.log("\nDONE: All categories indexed in Pinecone.");
  } catch (err) {
    console.error("\nCritical script failure:", err.message);
  }
};

executeUpsertDataScript();
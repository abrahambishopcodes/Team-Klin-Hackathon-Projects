import "dotenv/config"
import getEnv from "../utils/env";
import { Pinecone } from "@pinecone-database/pinecone";
import fs from "fs";
import path from "path";

const pinecone = new Pinecone({
  apiKey: getEnv("PINECONE_API_KEY")
})

const index = pinecone.index({
  name: getEnv("PINECONE_INDEX_NAME")
})

// function to process file
const processFile = async (filePath: string, fileType: "item" | "user" , namespace: string) => {

  const readStream = fs.createReadStream(filePath, "utf-8");
  
};

// main function to read files and process the files
const executeDataUpsert = async () => {
  const dir = path.join(__dirname, "../", "../", "data/raw");
  // read files from data directory
  fs.readdir(dir, (err, files) => {
      if (err) {
        throw err
      }

        if (!files || files.length === 0) {
    throw new Error("No files found in the directory or directory does not exist");
  }

  console.log(`Found ${files.length} files to process`)


  // map over the file and process individually
  files.map(async (file) => {
    const filePath = path.join(dir, file);
    const fileType: "item" | "user" = file.includes("meta") ? "item" : "user";

    console.log(` ====== Processing ${fileType} data from ${path.basename(filePath)} ====== `);

    // process file
    await processFile(filePath, fileType, `project_2_${fileType}s`)

    console.log(` ====== Finished processing ${fileType} data from ${path.basename(filePath)} ====== `);
  })

  });

};

executeDataUpsert();
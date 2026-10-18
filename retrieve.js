import "dotenv/config";
import fs from "fs";
import axios from "axios";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MongoClient } from "mongodb";
import {
  JSONLoader,
  JSONLinesLoader,
} from "@langchain/classic/document_loaders/fs/json";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

const ollama = "http://localhost:11434";
const mongourl = process.env.MONGODB_URI;

const client = new MongoClient(mongourl);
await client.connect();
const db = client.db("langchain_demo");
const collection = db.collection("collection_of_text_rule");

const embeddings = new OllamaEmbeddings({
  model: "embeddinggemma",
});

const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
  collection,
  indexName: "vector_index", // Defaults to "default"
  textKey: "text",           // Defaults to "text"
  embeddingKey: "embedding", // Defaults to "embedding"
});
export const getSearchResult = async (query) => {
  let similaritySearchResults = await vectorStore.similaritySearch(query, 2);
  const context = similaritySearchResults
  .map((doc, i) => `Source ${i + 1}:\n${doc.pageContent}`)
  .join("\n\n");
  console.log(`Result: ${context}`);
  return context;
}

// Same loader mapping as index.js
const loaders = {
  ".json": (blob) => new JSONLoader(blob, "/texts"),
  ".jsonl": (blob) => new JSONLinesLoader(blob, "/html"),
  ".txt": (blob) => new TextLoader(blob),
  ".csv": (blob) => new CSVLoader(blob, "text"),
};

export const supportedExtensions = Object.keys(loaders);

export const ingestDocument = async (buffer, fileName, extension) => {
  const docs = await loaders[extension](new Blob([buffer])).load();
  docs.forEach((doc) => {
    doc.metadata = { ...doc.metadata, source: fileName };
  });
  await vectorStore.addDocuments(docs);
  return docs.length;
};










// const vectors = JSON.parse(fs.readFileSync("vectors.json"));
// const ollama = "http://localhost:11434";

// function cosineSimilarity(a, b) {
//   const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
//   const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
//   const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
//   return dot / (magA * magB);
// }

// export async function retrieveRelevant(query, k = 2) {
//   const res = await axios.post(`${ollama}/api/embed`, {
//     model: "embeddinggemma",
//     input: query
//   });

//   const queryEmbedding = res.data.embeddings[0];

//   return vectors
//     .map(v => ({
//       text: v.text,
//       score: cosineSimilarity(queryEmbedding, v.embedding)
//     }))
//     .sort((a, b) => b.score - a.score)
//     .slice(0, k)
//     .map(v => v.text);
// }
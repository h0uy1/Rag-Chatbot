import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChatOllama } from "@langchain/ollama";
import path from "path";
import {
  getSearchResult,
  ingestDocument,
  supportedExtensions,
} from "./retrieve.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const llm = new ChatOllama({
  model: "gemma4",
});

app.post("/ask-hr", async (req, res) => {
  try {
    const question = req.body.question?.trim();

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const context = await getSearchResult(question);
    console.log("Retrieved context:", context);
    const prompt = `
You are a helpful assistant.
Use the context below to answer the question.

Context:
${context}

Question:
${question}

Answer in a clear and concise way:
`;

    // const response = await llm.invoke(prompt);

    // const answer =
    //   typeof response.content === "string"
    //     ? response.content
    //     : JSON.stringify(response.content);

    // res.json({ answer });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    for await (const chunk of await llm.stream(prompt)) {
      res.write(`data: ${chunk.content}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Error answering question:", error);
    res.status(500).json({ error: "Failed to answer question" });
  }
});

app.post(
  "/upload",
  express.raw({ type: "application/octet-stream", limit: "5mb" }),
  async (req, res) => {
    try {
      const fileName = path.basename(
        decodeURIComponent(req.get("X-File-Name") || "")
      );
      const extension = path.extname(fileName).toLowerCase();

      if (!fileName || !supportedExtensions.includes(extension)) {
        return res.status(400).json({
          error: `Unsupported file type. Allowed: ${supportedExtensions.join(", ")}`,
        });
      }

      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: "File is empty" });
      }

      const chunks = await ingestDocument(req.body, fileName, extension);
      res.json({ message: `${fileName} stored successfully`, chunks });
    } catch (error) {
      console.error("Error ingesting document:", error);
      res.status(500).json({ error: "Failed to store document" });
    }
  }
);

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "File is larger than 5 MB" });
  }
  next(err);
});

app.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);

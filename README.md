# HR Chatbot (RAG)

A local Retrieval-Augmented Generation chatbot. Upload documents (e.g. a candidate's resume) through the web UI, they get embedded and stored in MongoDB Atlas Vector Search, and questions are answered by a local LLM running on Ollama using the most relevant documents as context.

## Tech stack

- **Node.js + Express**: API server and static frontend
- **LangChain**: document loaders and vector store integration
- **MongoDB Atlas Vector Search**: stores text and embeddings
- **Ollama**: local models
  - `embeddinggemma` for embeddings (768 dimensions)
  - `gemma4` for chat answers

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [Ollama](https://ollama.com/) installed and running
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (the free M0 tier works)

## Setup

### 1. Install dependencies

```bash
git clone <your-repo-url>
cd chatbot
npm install
```

### 2. Pull the Ollama models

```bash
ollama pull embeddinggemma
ollama pull gemma4
```

Make sure Ollama is running. http://localhost:11434 should show "Ollama is running".

### 3. Configure MongoDB Atlas

1. **Network Access**: add your current IP address. If you skip this, connecting fails with `SSL alert number 80`.
2. **Database Access**: create a database user.
3. **Create the vector search index.** In your cluster, open **Atlas Search → Create Search Index → Atlas Vector Search → JSON Editor**, select database `langchain_demo` and collection `collection_of_text_rule`, name the index `vector_index`, and use:

   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 768,
         "similarity": "cosine"
       }
     ]
   }
   ```

   Wait until the index status shows **READY**. If the index is missing, searches return no results.

### 4. Create a `.env` file

In the project root, add:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?appName=<app-name>
```

`.env` is in `.gitignore`. Never commit it.

## Run

```bash
npm run dev
```

Then open http://localhost:3000.

## Usage

1. **Upload a document.** In the sidebar, pick a file and click **Upload & ingest**. When it finishes, you'll see "stored successfully".
   - Supported formats: `.txt`, `.json` (reads the `/texts` field), `.jsonl` (reads the `/html` field), `.csv` (reads the `text` column)
   - Maximum size: 5 MB
2. **Ask questions** in the chat, e.g. *"What is this candidate strongest at?"*

## Project structure

```
public/index.html   Chat and upload UI
server.js           Express server: POST /ask-hr (streaming answer), POST /upload (ingestion)
retrieve.js         MongoDB connection, vector search and document ingestion
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `SSL alert number 80` / `MongoServerSelectionError` | Add your IP address under Atlas **Network Access** and check that the cluster isn't paused |
| `Cannot read properties of undefined (reading 'startsWith')` | `.env` is missing or `MONGODB_URI` isn't set |
| The assistant says it has no context | Create the `vector_index` index (see step 3) and upload a document |
| `fetch failed` / `ECONNREFUSED` when asking a question | Start Ollama and pull both models |
| Upload returns 404 | Restart the server; an old process is still running |
| `EADDRINUSE: port 3000` | Another server is already running. Stop it with Ctrl+C |

## Limitations

- Each uploaded file is stored as a single document; there's no chunking yet, so very long files may be cut off by the embedding model.
- `/upload` has no authentication. Run it locally only, or add authentication before deploying.

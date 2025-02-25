import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || "",
    });

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize embeddings model
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small", // Using a modern embedding model
    });

    // Step 1: Get the index
    const indexName = process.env.PINECONE_INDEX_NAME || "your-index-name";
    const index = pinecone.Index(indexName);
    
    // Step 2: Create a vector store
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      namespace: "", // Leave empty as environment is deprecated
    });
    
    // Step 3: Perform similarity search to get relevant chunks
    const similarDocs = await vectorStore.similaritySearch(query, 3);
    
    // Step 4: Format the context from retrieved documents
    const context = similarDocs.map(doc => doc.pageContent).join("\n\n");
    
    // Step 5: Generate a response using OpenAI with the retrieved context
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Answer the user's question based on the following context. 
          Keep your response concise and conversational. If the context doesn't contain relevant information, 
          say you don't have enough information but provide a general response if possible.`
        },
        {
          role: "user",
          content: `Context: ${context}\n\nQuestion: ${query}`
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });
    
    const responseText = response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    return res.status(200).json({ response: responseText });
  } catch (error) {
    console.error('RAG API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process query',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 
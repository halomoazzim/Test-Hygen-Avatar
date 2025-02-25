import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAI } from "openai";

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

export async function generateRagResponse(query: string): Promise<string> {
  try {
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
    
    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error in RAG process:", error);
    return `I'm sorry, I encountered an error while processing your request. ${error instanceof Error ? error.message : ''}`;
  }
} 
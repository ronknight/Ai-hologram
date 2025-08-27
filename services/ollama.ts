/**
 * This service provides functions to interact with a local Ollama server.
 * The prompting strategies are designed to be reusable and are based on the principle
 * of providing explicit, constrained instructions to the AI model (e.g., gemma2:2b)
 * to achieve reliable, structured, and grounded responses.
 */
import { ChatMessage, OllamaModel, MessageRole } from '../types';

// --- Helper for robust fetching ---
/**
 * A wrapper around fetch that includes a timeout.
 * @param resource The URL to fetch.
 * @param options Fetch options, including an optional `timeout` in milliseconds.
 */
async function fetchWithTimeout(
  resource: RequestInfo,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 15000 } = options; // Default timeout of 15 seconds

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    // Re-throw the error so it can be caught by the calling function
    throw error;
  }
}

// --- Type Definitions for Ollama API ---

interface OllamaGenerateBody {
  model: string;
  prompt: string;
  stream: false;
  format?: 'json';
  options?: {
    temperature?: number;
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

// --- Internal Helper Functions ---

/**
 * A resilient function to extract a JSON string from a model's response.
 * Per prompting best practices, this handles cases where the model might
 * accidentally wrap the JSON in markdown fences or add conversational text.
 * It identifies if the response should be an object or an array and extracts
 * the content between the first and last corresponding brackets.
 * @param text The text which may contain a JSON string.
 * @returns The extracted JSON string or null if not found.
 */
function extractJson(text: string): string | null {
  text = text.trim();
  
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  
  let startIndex;
  
  if (firstBrace === -1 && firstBracket === -1) {
    return null;
  }
  
  if (firstBrace !== -1 && (firstBrace < firstBracket || firstBracket === -1)) {
    // Starts with '{', so it's an object
    startIndex = firstBrace;
    const lastBrace = text.lastIndexOf('}');
    if (lastBrace > startIndex) {
      return text.substring(startIndex, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    // Starts with '[', so it's an array
    startIndex = firstBracket;
    const lastBracket = text.lastIndexOf(']');
    if (lastBracket > startIndex) {
      return text.substring(startIndex, lastBracket + 1);
    }
  }

  return null; // Could not find a matching pair
}


/**
 * The core generation function for non-streaming requests.
 * All non-chat interactions with the Ollama server are done via POST requests
 * to the /api/generate endpoint.
 */
async function generate(baseUrl: string, body: OllamaGenerateBody): Promise<OllamaGenerateResponse> {
    const response = await fetchWithTimeout(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API Error: ${response.status} - ${errorText}`);
    }
    return response.json();
}


// --- Public API ---

/**
 * Fetches the list of available models from an Ollama server.
 */
export async function getModels(baseUrl: string): Promise<OllamaModel[]> {
  const response = await fetchWithTimeout(`${baseUrl}/api/tags`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch models from Ollama: ${response.status} ${errorText}`);
  }
  const data = await response.json();
  return data.models;
}


/**
 * Generates a streaming chat response from Ollama.
 * Note: This uses the /api/chat endpoint to support conversational history,
 * which is a more suitable approach for chat applications than /api/generate.
 */
export async function generateChatStream(
  baseUrl: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  temperature: number,
  onChunk: (chunk: string) => void,
  onClose: () => void,
  onError: (error: Error) => void
): Promise<void> {
    const fullMessages: ChatMessage[] = [
        { role: MessageRole.SYSTEM, content: systemPrompt },
        ...messages
    ];

    const body = {
        model,
        messages: fullMessages,
        stream: true,
        options: {
            temperature
        }
    };
    
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const chunkJson = JSON.parse(line);
          if (chunkJson.message && chunkJson.message.content) {
            onChunk(chunkJson.message.content);
          }
        } catch (error) {
          console.error('Failed to parse stream chunk:', line, error);
        }
      }
    }
  } catch (error) {
    console.error('Ollama stream error:', error);
    onError(error as Error);
  } finally {
    onClose();
  }
}

// --- Prompting Strategies for /api/generate ---

interface GenerateOptions {
    baseUrl: string;
    model: string;
    temperature?: number;
}

/**
 * **Strategy 1: Structured JSON Output**
 * Generates a response that is a syntactically correct JSON object or array.
 * This is achieved by combining an explicit prompt with the `format: "json"` API parameter.
 * @param prompt The user's instruction.
 * @param schemaDescription A description of the desired JSON structure.
 * @returns The parsed JSON object/array.
 */
export async function generateJson<T>(options: GenerateOptions, prompt: string, schemaDescription: string): Promise<T> {
    // The prompt includes an explicit command, schema definition, and negative constraints.
    const fullPrompt = `Your response MUST be a single JSON object that adheres to the following description: "${schemaDescription}". Do not include markdown fences, introductory text, explanations, or any other text. Only provide the raw JSON object.\n\nUser request: "${prompt}"`;
    
    const body: OllamaGenerateBody = {
        model: options.model,
        prompt: fullPrompt,
        stream: false,
        format: "json",
        options: { temperature: options.temperature ?? 0.2 }
    };
    
    const result = await generate(options.baseUrl, body);
    const jsonString = extractJson(result.response);

    if (!jsonString) {
        throw new Error("Model did not return a valid JSON object. Raw response: " + result.response);
    }
    
    try {
        return JSON.parse(jsonString) as T;
    } catch (e) {
        throw new Error(`Failed to parse JSON. Raw response: ${result.response}`);
    }
}

/**
 * **Strategy 2: Constrained Text**
 * Generates a short, specific text output by giving the model a single, restrictive job.
 * @param text The text or topic to process.
 * @param task A clear, single instruction for the model (e.g., "Summarize this into a concise, one-line description.").
 * @returns The resulting text string.
 */
export async function generateConstrainedText(options: GenerateOptions, text: string, task: string): Promise<string> {
    // The prompt gives one clear task and defines the exact output format.
    const fullPrompt = `${task}\n\nYour response must contain ONLY the result, with no preamble, labels, or explanation.\n\nText: "${text}"`;
    
    const body: OllamaGenerateBody = {
        model: options.model,
        prompt: fullPrompt,
        stream: false,
        options: { temperature: options.temperature ?? 0.7 }
    };
    
    const result = await generate(options.baseUrl, body);
    return result.response.trim();
}

/**
 * **Strategy 3: Rich Content (e.g., Markdown)**
 * Generates formatted text by setting a persona and structure for the model to follow.
 * @param prompt The user's core request.
 * @param persona The role the model should play (e.g., "an expert in cloud infrastructure").
 * @param format The desired output format (e.g., "Markdown").
 * @param structure An optional list of required sections.
 * @returns The formatted string.
 */
export async function generateRichContent(options: GenerateOptions, prompt: string, persona: string, format: string, structure?: string[]): Promise<string> {
    // The prompt sets a persona, defines the format, and can mandate a structure.
    let fullPrompt = `As ${persona}, ${prompt}.\n\nGenerate a detailed response in ${format} format.`;
    if (structure && structure.length > 0) {
        fullPrompt += `\nThe response must include the following sections: ${structure.join(', ')}.`;
    }
    
    const body: OllamaGenerateBody = {
        model: options.model,
        prompt: fullPrompt,
        stream: false,
        options: { temperature: options.temperature ?? 0.8 }
    };
    
    const result = await generate(options.baseUrl, body);
    return result.response;
}


/**
 * **Strategy 4: Grounded Q&A**
 * Forces the model to answer a question based ONLY on the context you provide,
 * preventing it from using its general knowledge.
 * @param context The data the model is allowed to use.
 * @param question The user's question about the context.
 * @returns The model's answer.
 */
export async function generateGroundedResponse(options: GenerateOptions, context: string, question: string): Promise<string> {
    // The prompt provides data first, constrains the scope, and then asks the question.
    const fullPrompt = `You are an AI assistant. Your task is to answer the user's question based ONLY on the context provided below. Do not use any external knowledge.\n\n--- CONTEXT ---\n${context}\n\n--- QUESTION ---\n${question}`;
    
    const body: OllamaGenerateBody = {
        model: options.model,
        prompt: fullPrompt,
        stream: false,
        options: { temperature: options.temperature ?? 0.5 }
    };
    
    const result = await generate(options.baseUrl, body);
    return result.response.trim();
}
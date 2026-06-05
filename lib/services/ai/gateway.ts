/**
 * AI Gateway Service - Handles AI interactions via Vercel AI Gateway
 *
 * Uses AI SDK with Vercel AI Gateway for:
 * - Higher rate limits (vs direct Anthropic API)
 * - Automatic retries and fallbacks
 * - Structured output with Zod schema validation
 *
 * @see https://vercel.com/docs/ai-gateway
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data
 */

import { generateObject } from "ai";
import { z } from "zod";

const AI_GATEWAY_MODEL = "openai/gpt-5.2-pro";

export interface GenerateObjectOptions {
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface GenerateObjectResult<T> {
  success: boolean;
  object?: T;
  error?: string;
  model?: string;
}

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options: GenerateObjectOptions = {}
): Promise<GenerateObjectResult<T>> {
  try {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "AI_GATEWAY_API_KEY environment variable not configured",
      };
    }

    type MessageRole = "system" | "user";
    const messages: Array<{ role: MessageRole; content: string }> = [];

    if (options.system) {
      messages.push({ role: "system" as const, content: options.system });
    }

    messages.push({ role: "user" as const, content: prompt });

    type GenerateObjectInput<SchemaType> = {
      model: string;
      schema: z.ZodSchema<SchemaType>;
      messages: Array<{ role: MessageRole; content: string }>;
      temperature?: number;
      maxOutputTokens?: number;
    };
    type GenerateObjectResultPayload<SchemaType> = {
      object: SchemaType;
    };

    const generateObjectWithGateway = generateObject as unknown as <SchemaType>(
      args: GenerateObjectInput<SchemaType>
    ) => Promise<GenerateObjectResultPayload<SchemaType>>;

    const result = await generateObjectWithGateway({
      model: AI_GATEWAY_MODEL,
      schema,
      messages,
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxTokens ?? 2000,
    });
    const { object } = result;

    return {
      success: true,
      object: object as T,
      model: AI_GATEWAY_MODEL,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI Gateway request failed";
    console.error("[AI Gateway] Error:", message);
    return {
      success: false,
      error: message,
    };
  }
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const FALLBACK_MODEL = "claude-3-5-sonnet-20240620";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

interface ClaudeApiResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text?: string }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface ClaudeApiError {
  error?: {
    type: string;
    message: string;
  };
}

interface ClaudeFallbackDetails {
  originalError?: unknown;
  fallbackError?: unknown;
}

export interface ClaudeResponse {
  success: boolean;
  content?: string;
  fullResponse?: ClaudeApiResponse;
  model?: string;
  error?: string;
  details?: ClaudeApiResponse | ClaudeApiError | ClaudeFallbackDetails;
  usedFallback?: boolean;
}

/**
 * @deprecated Use generateStructuredOutput() instead for new code
 */
export class AIService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || "";
  }

  async chat(
    messages: ClaudeMessage[],
    options: ClaudeOptions = {}
  ): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: "ANTHROPIC_API_KEY not configured",
      };
    }

    const model = options.model || DEFAULT_MODEL;
    const requestBody = {
      model,
      max_tokens: options.maxTokens || 1024,
      messages,
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(options.system && { system: options.system }),
    };

    try {
      const response = await this.makeRequest(requestBody);

      if (response.success) {
        return response;
      }

      if (response.statusCode === 404 && model !== FALLBACK_MODEL) {
        console.log(
          `Model ${model} not found, trying fallback: ${FALLBACK_MODEL}`
        );
        const fallbackBody = { ...requestBody, model: FALLBACK_MODEL };
        const fallbackResponse = await this.makeRequest(fallbackBody);

        if (fallbackResponse.success) {
          return {
            ...fallbackResponse,
            usedFallback: true,
          };
        }

        return {
          success: false,
          error: "Claude API request failed (including fallback)",
          details: {
            originalError: response.details,
            fallbackError: fallbackResponse.details,
          },
        };
      }

      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to call Claude API";
      return {
        success: false,
        error: message,
      };
    }
  }

  async prompt(
    content: string,
    options: ClaudeOptions = {}
  ): Promise<ClaudeResponse> {
    return this.chat([{ role: "user", content }], options);
  }

  private async makeRequest(body: {
    model: string;
    max_tokens: number;
    messages: ClaudeMessage[];
    temperature?: number;
    system?: string;
  }): Promise<ClaudeResponse & { statusCode?: number }> {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });

      const data: ClaudeApiResponse | ClaudeApiError = await response.json();

      if (!response.ok) {
        const errorData = data as ClaudeApiError;
        return {
          success: false,
          error: errorData.error?.message || "Claude API request failed",
          details: errorData,
          statusCode: response.status,
        };
      }

      const successData = data as ClaudeApiResponse;
      const textContent = successData.content?.find(
        (c) => c.type === "text"
      )?.text;

      return {
        success: true,
        content: textContent,
        fullResponse: successData,
        model: successData.model,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network error";
      return {
        success: false,
        error: message,
        statusCode: 0,
      };
    }
  }
}

let aiServiceInstance: AIService | null = null;

/**
 * @deprecated Use generateStructuredOutput() instead for new code
 */
export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  model?: string;
  thinking?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveGeminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.geminiApiKey}`;

const assertApiKey = () => {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
};

function convertContentToParts(content: MessageContent | MessageContent[]): any[] {
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) content = [content];
  return content.map(c => {
    if (typeof c === "string") return { text: c };
    if (c.type === "text") return { text: c.text };
    if (c.type === "image_url") {
      const url = c.image_url.url;
      // Handle base64 data URLs
      if (url.startsWith("data:")) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
      }
      // Handle regular URLs - use fileData
      return { fileData: { mimeType: "image/jpeg", fileUri: url } };
    }
    if (c.type === "file_url") {
      return { fileData: { mimeType: c.file_url.mime_type || "application/octet-stream", fileUri: c.file_url.url } };
    }
    return { text: JSON.stringify(c) };
  });
}

function convertToGeminiSchema(schema: any): any {
  if (!schema) return schema;
  const result: any = {};
  if (schema.type) {
    if (Array.isArray(schema.type)) {
      // Handle nullable types like ["integer", "null"]
      const nonNull = schema.type.filter((t: string) => t !== "null");
      result.type = nonNull[0]?.toUpperCase() || "STRING";
      if (schema.type.includes("null")) result.nullable = true;
    } else {
      result.type = schema.type.toUpperCase();
    }
  }
  if (schema.properties) {
    result.properties = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      result.properties[key] = convertToGeminiSchema(val);
    }
  }
  if (schema.required) result.required = schema.required;
  if (schema.items) result.items = convertToGeminiSchema(schema.items);
  if (schema.enum) result.enum = schema.enum;
  if (schema.description) result.description = schema.description;
  return result;
}

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

const RETRY_MAX_RETRIES = 4;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;

type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

const parseRetryAfter = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
};

// Equal-jitter exponential backoff. The cap/2 floor guarantees a minimum
// delay so a misbehaving caller loop slows down instead of hammering the
// upstream while it keeps returning errors.
const computeBackoffDelay = (
  attempt: number,
  retryAfterMs?: number
): number => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};

// Retries non-2xx responses and network errors with exponential backoff, then
// returns the final Response so callers keep their existing error handling.
const fetchWithBackoff = async (
  url: string,
  init: FetchInit
): Promise<Response> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }

      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
        // Body already settled; nothing to clean up.
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("LLM request failed after exhausting retries");
};

export async function invokeLLM(options: InvokeParams): Promise<InvokeResult> {
  const model = options.model || "gemini-2.5-flash";
  assertApiKey();
  
  // Separate system messages from conversation
  const systemParts: any[] = [];
  const contents: any[] = [];
  
  for (const msg of options.messages) {
    if (msg.role === "system") {
      const text = typeof msg.content === "string" ? msg.content : 
        Array.isArray(msg.content) ? msg.content.filter(c => typeof c === 'string' || c.type === 'text').map(c => typeof c === 'string' ? c : (c as any).text).join('\n') : String(msg.content);
      systemParts.push({ text });
    } else {
      const parts = convertContentToParts(msg.content);
      contents.push({ role: msg.role === "assistant" ? "model" : "user", parts });
    }
  }
  
  const generationConfig: any = {};
  const resolvedMaxTokens = options.max_tokens ?? options.maxTokens;
  if (resolvedMaxTokens) generationConfig.maxOutputTokens = resolvedMaxTokens;
  
  // Handle structured output schema
  const resolvedFormat = normalizeResponseFormat({
    responseFormat: options.responseFormat,
    response_format: options.response_format,
    outputSchema: options.outputSchema,
    output_schema: options.output_schema,
  });
  if (resolvedFormat?.type === "json_schema" && resolvedFormat.json_schema?.schema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = convertToGeminiSchema(resolvedFormat.json_schema.schema);
  } else if (resolvedFormat?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }
  
  const body: any = { contents, generationConfig };
  if (systemParts.length) body.systemInstruction = { parts: systemParts };
  
  const url = resolveGeminiUrl(model);
  const response = await fetchWithBackoff(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }
  
  const data = await response.json();
  
  // Convert Gemini response to OpenAI-compatible format for existing callers
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return {
    id: data.id || "",
    created: Date.now(),
    model: model,
    choices: [{ 
      index: 0,
      message: { content: text, role: "assistant" },
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0,
    }
  } as InvokeResult;
}

export type ModelInfo = {
  id: string;
  object: string;
  created: number;
  owned_by: string;
};

export type ModelsResponse = {
  object: string;
  data: ModelInfo[];
};

export async function listLLMModels(): Promise<ModelsResponse> {
  assertApiKey();

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${ENV.geminiApiKey}`;

  const response = await fetchWithBackoff(url, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `List LLM models failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const data = await response.json();
  const mapped = (data.models || []).map((m: any) => ({
    id: m.name.replace("models/", ""),
    object: "model",
    created: 0,
    owned_by: "google",
  }));

  return { object: "list", data: mapped };
}

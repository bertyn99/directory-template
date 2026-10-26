import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import prompts from "../data/prompt.json";

/** Prompt payload: plain text, or a context object for {{name}}/{{context}} substitution. */
type GenerateContentData =
  | string
  | {
      name?: string | null;
      context?: string | null;
    };

interface GenerateContentParams {
  type: "category" | "venue" | "venueEnrich";
  subType: "keyPoints" | "competitions" | "techniques" | "equipments" | "content";
  data: GenerateContentData;
  languages: string | null;
}

export async function generateContent({
  type,
  subType,
  data,
  languages,
}: GenerateContentParams): Promise<string> {
  const prompt = createPrompt(type, subType, data, languages);
  const config = useRuntimeConfig();
  const geminiApiKey = config.geminiApiKey;

  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables");
  }

  const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt,
      // gemini-2.5-flash spends output budget on hidden thinking first, which truncated every
      // multi-locale JSON payload mid-array; budget generously to absorb it
      maxOutputTokens: subType === "content" || type === "venueEnrich" ? 32768 : 16384,
    });

    return text;
  } catch (error) {
    console.error(
      "[contentGen] Error generating content:",
      error instanceof Error ? error.message : error,
    );
    throw new Error("Failed to generate content", { cause: error });
  }
}

function createPrompt(
  type: string,
  subType: string | null,
  data: GenerateContentData,
  language: string | null,
): string {
  const promptCategory = prompts[type as keyof typeof prompts];
  if (!promptCategory) {
    throw new Error(`No prompt category found for type "${type}"`);
  }

  let promptTemplate: string;

  if (typeof promptCategory === "string") {
    // Handle case where promptCategory is directly a string (no subtype)
    promptTemplate = promptCategory;
  } else if (typeof promptCategory === "object" && subType) {
    // Handle case where promptCategory is an object (has subtypes)
    promptTemplate = promptCategory[subType as keyof typeof promptCategory];
    if (typeof promptTemplate !== "string") {
      throw new Error(`No prompt found for type "${type}" and subType "${subType}"`);
    }
  } else {
    throw new Error(`Invalid prompt structure for type "${type}"`);
  }

  // Replace {{name}} and {{lang}}
  let result = promptTemplate;

  // Inject anti-slop rules
  let antiSlopText = "";
  const antiSlop: Record<string, string> | undefined = prompts.antiSlop;
  if (antiSlop) {
    if (antiSlop.global) {
      antiSlopText += antiSlop.global + "\n";
    }

    // Match requested languages (can be "fr" or "[fr,en]")
    const langString = language || "";
    const supportedLangs = ["en", "fr", "es", "de", "it", "pt"];
    const requestedLangs = supportedLangs.filter((l) => langString.includes(l));

    for (const l of requestedLangs) {
      if (antiSlop[l]) {
        antiSlopText += antiSlop[l] + "\n";
      }
    }

    if (antiSlopText) {
      antiSlopText += "END OF ANTI-SLOP RULES — APPLY THESE STRICTLY TO YOUR RESPONSE\n\n";
      result = antiSlopText + result;
    }
  }

  if (data) {
    if (typeof data === "string") {
      result = result.replace(/\{\{data\}\}/g, data);
    } else {
      if (data.name && language) {
        result = result.replace(/\{\{name\}\}/g, data.name);
        result = result.replace(/\{\{lang\}\}/g, language);
      }

      // Replace {{context}} for venueEnrich (scraped website/maps data)
      if (data.context) {
        result = result.replace(/\{\{context\}\}/g, data.context);
      }
    }
  }

  return result;
}

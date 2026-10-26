// Ambient types for turndown / turndown-plugin-gfm (no official types shipped).
// Only the API surface used by server/services/scraping/venue-website.ts.

declare module "turndown" {
  type Rule = {
    filter: string | string[] | ((node: HTMLElement, options: unknown) => boolean);
    replacement: (
      content: string,
      node: HTMLElement,
      options: unknown,
    ) => string;
  };

  class TurndownService {
    constructor(options?: {
      headingStyle?: "setext" | "atx";
      hr?: string;
      bulletListMarker?: "-" | "+" | "*";
      codeBlockStyle?: "indented" | "fenced";
      fence?: "```" | "~~~";
      emDelimiter?: "_" | "*";
      strongDelimiter?: "**" | "__";
      linkStyle?: "inlined" | "referenced";
      br?: string;
    });
    use(plugin: TurndownService.Plugin | TurndownService.Plugin[] | unknown): TurndownService;
    addRule(rule: Rule): TurndownService;
    turndown(html: string | HTMLElement): string;
  }

  export default TurndownService;
  export type Plugin = (service: TurndownService) => void;
}

declare module "turndown-plugin-gfm" {
  import type { Plugin } from "turndown";

  export const gfm: Plugin;
  export const strikethrough: Plugin;
  export const tables: Plugin;
  export const taskListItems: Plugin;
}

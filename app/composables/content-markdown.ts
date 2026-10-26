import type { Component } from 'vue'
import Checklist from "~/components/content/Checklist.vue";
import CityLinks from "~/components/content/CityLinks.vue";
import VenueCta from "~/components/content/VenueCta.vue";
import CompareTable from "~/components/content/CompareTable.vue";
import EquipmentKit from "~/components/content/EquipmentKit.vue";
import Glossary from "~/components/content/Glossary.vue";
import NutritionPick from "~/components/content/NutritionPick.vue";
import ProsePre from "~/components/prose/ProsePre.vue";
import SiloLinks from "~/components/content/SiloLinks.vue";

/**
 * Component map for the Comark renderer (MarkdownDocument) fed by
 * Nuxt Content's minimark `body.value` nodes.
 *
 * Callouts (tip/warning/note/caution/callout), card, card-group, steps
 * and badge resolve through the Nuxt UI prose integration that
 * @comark/nuxt registers automatically; the site-specific components
 * are mapped explicitly below. Mermaid fences are handled by
 * components/prose/ProsePre.vue (Pele SVG, server-rendered).
 */
export const contentComponents: Record<string, Component> = {
  // pre: mermaid fences -> Pele SVG (server-rendered); other fences -> styled block
  pre: ProsePre,
  "silo-links": SiloLinks,
  "venue-cta": VenueCta,
  "equipment-kit": EquipmentKit,
  "city-links": CityLinks,
  "nutrition-pick": NutritionPick,
  glossary: Glossary,
  checklist: Checklist,
  "compare-table": CompareTable,
};

/**
 * Adapt Nuxt Content's minimark body (`{ type: 'minimark', value: nodes }`)
 * to a Comark tree for MarkdownDocument. The node tuple format is the same
 * (`['tag', props, ...children]`); only the envelope differs.
 */
export function contentTree(body: { type?: string; value?: unknown[] } | null | undefined) {
  const nodes = Array.isArray(body?.value) ? body!.value : [];
  return { nodes, frontmatter: {}, meta: {} };
}

import { mkdir, writeFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join } from 'node:path'
import { excerptPlainText, type ContentLocale } from '~~/shared/silo'

export interface HubFaqItem {
  q: string
  a: string
}

export interface HubMarkdownPayload {
  locale: ContentLocale
  canonicalSlug: string
  title: string
  description: string
  intro: string
  faq: HubFaqItem[]
  translationKey?: string
}

export function hubMarkdownAbsPath(locale: ContentLocale, canonicalSlug: string): string {
  return join(process.cwd(), 'content', locale, 'category-guides', canonicalSlug, 'hub.md')
}

export async function hubMarkdownExists(locale: ContentLocale, canonicalSlug: string): Promise<boolean> {
  try {
    await access(hubMarkdownAbsPath(locale, canonicalSlug), constants.F_OK)
    return true
  }
  catch {
    return false
  }
}

function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function serializeHubMarkdown(payload: HubMarkdownPayload): string {
  const today = new Date().toISOString().slice(0, 10)
  const faqYaml = payload.faq
    .map(item => `  - q: ${yamlQuote(item.q)}\n    a: ${yamlQuote(item.a)}`)
    .join('\n')

  const translationLine = payload.translationKey
    ? `translationKey: ${yamlQuote(payload.translationKey)}\n`
    : ''

  return `---
style: ${payload.canonicalSlug}
type: hub
title: ${yamlQuote(payload.title)}
description: ${yamlQuote(payload.description)}
${translationLine}category: "Guide"
createdAt: "${today}"
updatedAt: "${today}"
faq:
${faqYaml}
---

${payload.intro.trim()}
`
}

export async function writeHubMarkdown(payload: HubMarkdownPayload): Promise<string> {
  const abs = hubMarkdownAbsPath(payload.locale, payload.canonicalSlug)
  await mkdir(join(process.cwd(), 'content', payload.locale, 'category-guides', payload.canonicalSlug), {
    recursive: true,
  })
  await writeFile(abs, serializeHubMarkdown(payload), 'utf8')
  return abs
}

export function hubIntroFromLegacyJsonb(markdown: string): string {
  return excerptPlainText(markdown, 100)
}

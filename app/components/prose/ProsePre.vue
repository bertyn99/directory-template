<script setup lang="ts">
import { Pele } from 'comark-pele/vue'
import { textContent } from 'comark/utils'
import type { ElementNode } from 'comark'

/**
 * Comark `pre` renderer (auto-registered from components/prose/).
 *
 * Mermaid fences render server-side as Pele SVG (no client mermaid
 * bundle); every other fence renders as a plain styled code block.
 */
const props = defineProps<{
    __node?: ElementNode
    class?: string
}>()

// Nuxt Content's minimark stores the fence source and language as node
// PROPS (`code`, `class: 'language-mermaid'`), not as child nodes.
interface PreNodeProps {
    code?: string
    language?: string
    className?: string
    class?: string
    meta?: unknown
}

const nodeProps = computed<PreNodeProps>(() => {
    if (!Array.isArray(props.__node)) return {}
    return (props.__node[1] ?? {}) as PreNodeProps
})

const codeText = computed(() => {
    const fromProp = nodeProps.value.code
    if (typeof fromProp === 'string' && fromProp) return fromProp.trim()
    return props.__node ? textContent([props.__node]).trim() : ''
})

const language = computed(() => {
    if (nodeProps.value.language) return String(nodeProps.value.language)
    const match = /language-([\w-]+)/.exec(String(nodeProps.value.className ?? ''))
    return match?.[1] ?? ''
})

const isMermaid = computed(() => language.value === 'mermaid')
</script>

<template>
    <div v-if="isMermaid" class="mermaid not-prose overflow-x-auto my-6">
        <Pele :content="codeText" />
    </div>
    <pre
        v-else
        class="rounded-sm border border-default bg-muted p-4 overflow-x-auto text-sm not-prose"
    ><code>{{ codeText }}</code></pre>
</template>

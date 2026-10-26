<template>
    <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">

        <BaseHero>
            <BaseHeader />
        </BaseHero>
        <main class="relative z-0 flex-1 w-full max-w-[1600px] mx-auto px-4 py-8">
            <slot />
        </main>

        <BaseFooter />
    </div>
</template>

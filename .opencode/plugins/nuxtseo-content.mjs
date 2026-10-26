import { existsSync } from "node:fs"
import { resolve } from "node:path"

export const NuxtSeoContentPlugin = async ({ directory, client }) => {
  if (!existsSync(resolve(directory, "content"))) {
    return {}
  }

  if (existsSync(resolve(directory, ".claude/context/site-config.md"))) {
    await client.app.log({
      body: {
        service: "nuxtseo-content",
        level: "info",
        message: "Site configured (.claude/context/site-config.md)",
      },
    })
  } else {
    await client.app.log({
      body: {
        service: "nuxtseo-content",
        level: "warn",
        message: "Nuxt Content project detected, no site-config.md. Create .claude/context/site-config.md first if writing content.",
      },
    })
  }

  return {
    "session.created": async () => {
      if (existsSync(resolve(directory, ".claude/context/site-config.md"))) {
        return
      }
      await client.app.log({
        body: {
          service: "nuxtseo-content",
          level: "warn",
          message: "Nuxt Content project detected, no site-config.md. Create .claude/context/site-config.md first if writing content.",
        },
      })
    },
  }
}
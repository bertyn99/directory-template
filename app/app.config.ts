export default defineAppConfig({
  ui: {
    colors: {
      // Neutral base theme — the template ships NO brand palette. Primary and
      // secondary resolve to Tailwind's built-in `slate` scale, exposed by
      // @nuxt/ui as --ui-primary / --ui-secondary CSS variables. Each niche app
      // re-themes HERE at instantiation: point primary at another built-in
      // palette, or define a custom @theme static palette in
      // app/assets/css/main.css and reference its name (see docs/design-system.md).
      primary: "slate",
      secondary: "slate",
      neutral: "slate",
    },
    card: {
      slots: { root: 'divide-none' }
    },
    // Typography customization for Nuxt UI components
    button: {
      slots: {
        base: 'font-display font-bold uppercase tracking-wide'
      }
    },
    badge: {
      slots: {
        base: 'font-display font-bold uppercase tracking-wide'
      }
    },
    // Prose typography customization
    prose: {
      h1: {
        slots: {
          base: 'font-display font-bold text-4xl uppercase tracking-tight'
        }
      },
      h2: {
        slots: {
          base: 'font-display font-bold text-3xl uppercase tracking-tight'
        }
      },
      h3: {
        slots: {
          base: 'font-display font-bold text-2xl uppercase tracking-tight'
        }
      },
      h4: {
        slots: {
          base: 'font-display font-bold text-xl uppercase tracking-tight'
        }
      },
      h5: {
        slots: {
          base: 'font-display font-bold text-lg uppercase tracking-tight'
        }
      },
      h6: {
        slots: {
          base: 'font-display font-bold text-base uppercase tracking-tight'
        }
      },
      p: {
        base: 'font-body leading-relaxed'
      },
      strong: {
        base: 'font-medium'
      },
      a: {
        base: 'font-body font-medium text-primary hover:text-primary/80'
      }
    }
  },
});

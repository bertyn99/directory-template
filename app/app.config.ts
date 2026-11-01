import directoryConfig from "~~/directory.config";

// Nuxt UI layer of the design kit (directoryConfig.design is THE surface —
// this file only maps its tokens onto Nuxt UI's semantic config, so a niche
// rebrand never edits component code or this file).
const { accent, accentSecondary, neutral } =
  directoryConfig.design;

/** Heading/display text-transform as an arbitrary property — the value is a
    CSS variable injected from directoryConfig.design (nuxt.config head style),
    so the token stays overridable in one place. */
const displayTransformClass =
  "[text-transform:var(--design-display-transform,uppercase)]";

export default defineAppConfig({
  ui: {
    colors: {
      // Accent = THE brand color of the instantiation (design.accent);
      // secondary folds into the accent unless a distinct one is declared.
      primary: accent,
      secondary: accentSecondary ?? accent,
      neutral,
    },
    card: {
      slots: { root: 'divide-none' }
    },
    // Typography customization for Nuxt UI components
    button: {
      slots: {
        base: `font-display font-bold ${displayTransformClass} tracking-wide active:translate-y-px`,
      },
    },
    badge: {
      slots: {
        base: `font-display font-bold ${displayTransformClass} tracking-wide`
      }
    },
    // Prose typography customization
    prose: {
      h1: {
        slots: {
          base: `font-display font-bold text-4xl ${displayTransformClass} tracking-tight`
        }
      },
      h2: {
        slots: {
          base: `font-display font-bold text-3xl ${displayTransformClass} tracking-tight`
        }
      },
      h3: {
        slots: {
          base: `font-display font-bold text-2xl ${displayTransformClass} tracking-tight`
        }
      },
      h4: {
        slots: {
          base: `font-display font-bold text-xl ${displayTransformClass} tracking-tight`
        }
      },
      h5: {
        slots: {
          base: `font-display font-bold text-lg ${displayTransformClass} tracking-tight`
        }
      },
      h6: {
        slots: {
          base: `font-display font-bold text-base ${displayTransformClass} tracking-tight`
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

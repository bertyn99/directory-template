export default defineI18nConfig(() => {
  return {
    legacy: false,
    locale: "fr",
    fallbackLocale: "fr",
    messages: {
      fr: {
        breadcrumb: {
          items: {
            index: {
              icon: "heroicons:home",
              ariaLabel: "Accueil",
              label: "Accueil",
            },
            about: {
              icon: "i-heroicons-information-circle",
              ariaLabel: "À propos",
              label: "À propos",
            },
            venues: {
              icon: "i-heroicons-users",
              ariaLabel: "Venues",
              label: "Venues",
            },
            countries: {
              icon: "i-heroicons-globe-alt",
              ariaLabel: "Pays",
              label: "Pays",
            },
            categories: {
              list: {
                icon: "i-heroicons-globe-alt",
                ariaLabel: "Categories",
                label: "Categories",
              },
              detail: {
                icon: "i-heroicons-sparkles",
                ariaLabel: "Catégorie {category}",
                label: "Catégorie {category}",
              },
            },
            blog: {
              icon: "i-heroicons-pencil-alt",
              ariaLabel: "Blog",
              label: "Blog",
            },
          },
        },
        nav: {
          home: "Accueil",
          about: "A propos",
          venues: "Venues",
          countries: "Pays",
          categories: {
            list: "Categories",
            detail: "Catégorie {category}",
          },
          blog: "Blog",
        },
        footer: "Tous droit réservés",
        home: {
          title: {
            pt1: "Découvrez Votre",
            pt2: "Prêt à Partir",
          },
          subTitle:
            "Découvrez les venues locales où la passion rencontre la qualité. Votre prochaine séance commence ici.",

          search: {
            placeholder: "Entrez votre localisation",
            nofound: "Pas ville correspondante",
            cta: "Trouvez votre Venue",
            text: "Trouvez votre venue préféré",
          },
          stats: {
            title: "Le Répertoire Ultime des Venues en Europe",
            subtitle:
              "Connecter les passionnés et les venues dans le monde entier",
            venues: "Venues de bien-être et de sport en Europe",
            people: "Passionnés actifs en Europe",
            countries:
              "Pays Européens avec des venues référencées",
            satisfactions:
              "Satisfaction des utilisateurs parmi les visiteurs européens",
          },
        },
        categories: {
          title: "Explorer les différentes catégories de venues",
          subTitle: "",
          details: "Découvrez la {category}",
          cta: "En savoir plus sur la {category}",
          cities: {
            title: "Dans quelles villes trouve-t-on la {category}?",
            venue: "Découvrez les venues de {category} à {city}",
            more: "Voir plus",
            similar: "Categories similaires",
          },
        },
        countries: {
          title: "Pays européens avec des venues référencées",
          europe: "Pays Européens",
          cities: {
            count: "{count} villes avec des venues référencées",
            venues: "{nbVenues} venues au total",
            soon: "Arrive bientôt",
          },
        },
        venues: {
          title: "Explorer les venues",
          subTitle:
            "Explorez les venues dans différentes villes et pays. Comparez les offres et trouvez celle qui vous correspond.",
          filter: {
            name: "Filtrer",
            country: { name: "Pays", placeholder: "Sélectionner un pays" },
            city: {
              name: "Ville",
              placeholder: "Sélectionner une ville",
            },
            activities: {
              name: "Categories",
            },
          },

          info: "A propos",
          categories: "Categories",
          openingHours: "Heures d'ouvertures",
          website: "Site Web",
          location: "Localisation",
        },
        blog: {
          title: "Blog",
          subTitle:
            "Découvrez les derniers articles du blog",
          featured: "A la une",
          readMore: "Lire plus",
          noPost: "Aucun article trouvé",
          article: "Article",
        },
      },
      en: {
        breadcrumb: {
          items: {
            home: {
              icon: "heroicons:home",
              ariaLabel: "Home",
              label: "Home",
            },
            about: {
              icon: "heroicons:information-circle",
              ariaLabel: "About",
              label: "About",
            },
            venues: {
              icon: "heroicons:users",
              ariaLabel: "Venues",
              label: "Venues",
            },
            countries: {
              icon: "heroicons:globe-alt",
              ariaLabel: "Countries",
              label: "Countries",
            },
            categories: {
              list: {
                icon: "heroicons:collection",
                ariaLabel: "Categories",
                label: "Categories",
              },
              detail: {
                icon: "heroicons:sparkles",
                ariaLabel: "Catégorie {category}",
                label: "Catégorie {category}",
              },
            },
            blog: {
              icon: "heroicons:pencil-alt",
              ariaLabel: "Blog",
              label: "Blog",
            },
          },
        },
        nav: {
          home: "Home",
          about: "About Us",
          venues: "Venues",
          countries: "Countries",
          categories: {
            list: "Categories",
            detail: "Catégorie {category}",
          },
          blog: "Blog",
        },

        footer: "All rights reserved.",
        home: {
          title: {
            pt1: "Discover Your",
            pt2: "Fighting Spirit",
          },
          subTitle:
            "Discover local venues where quality meets passion. Your next session starts here.",
          search: {
            placeholder: "Enter your location",
            nofound: "No Venue Found",
            cta: "Find your venue",
            text: "Find the perfect venue for you",
          },
          stats: {
            title: "The Ultimate Venue Directory in Europe",
            subtitle:
              "Connecting enthusiasts and venues worldwide",

            venues: "Sports and wellness venues listed in Europe",
            people: "Active enthusiasts in Europe",
            countries: "European countries with listed venues",
            satisfactions: "User satisfaction among European visitors",
          },
        },
        categories: {
          title: "Explore Venue Categories",
          subTitle: "",
          cta: "Learn more about the {category}",
          details: "Discover the {category}",
          cities: {
            title: "In which cities can you find the {category}?",
            venue: "Discover {category} venues in {city}",
            more: "View more",
            similar: "Similar Categories",
          },
        },
        countries: {
          title: "European Countries with Directorys",
          europe: "European Countries",
          cities: {
            count: "{ count} cities with listed venues",
            venues: "{nbVenues} total venues",
            soon: "Coming Soon...",
          },
        },
        venues: {
          title: "Explore Venues",
          subTitle:
            "Explore venues across various cities and countries. Compare offers and find the one that fits you.",
          filter: {
            name: "Filter",
            country: { name: "Country", placeholder: "Select a country" },
            city: {
              name: "City",
              placeholder: "Select a city",
            },
            activities: {
              name: "Activities",
            },
          },
          info: "About",
          categories: "Categories",
          openingHours: "Opening Hours",
          website: "Website",
          location: "Location",
        },
        blog: {
          title: "Latest Posts",
          subTitle:
            "Discover the latest articles from the blog",
          featured: "Featured",
          readMore: "Read more",
          noPost: "No post found",
          article: "Article",
        },
      },
    },
  }
});

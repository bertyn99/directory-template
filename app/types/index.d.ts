import type { Collections } from "@nuxt/content";
import type { Avatar, Badge, Link } from "#ui/types";

export type BlogPost = Collections['blog_en'] & {
  path: string;
  date?: string;
  badge?: Badge;
  author?: {
    name: string;
    description?: string;
    avatar?: Avatar;
  } & Link;
};

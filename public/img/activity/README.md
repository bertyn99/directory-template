# Category images

Optional imagery per category slug: `/img/activity/<slug>.jpg` (jpg + webp).

The country/city pages build these paths from the EN-canonical catalog slug and
fall back to an `@error` placeholder when no file exists. When an on-disk file
name differs from the slug, map it in `ACTIVITY_IMAGE_ALIASES`
(`app/pages/country/[country]/[city].vue`).

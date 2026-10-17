// /valik/ lehtede valdkonnad: täpselt suunatesti valdkonnad (FIELD_ISCED + "muu"), et staatiline leht ja
// interaktiivne test annaksid sama vastuse. Valdkonna värav on EHIS-i õppekavarühm, mitte kureeritud `field`.
import { FIELD_ISCED, FIELD_OTHER } from "./suunatest-match.ts";
import { slugify } from "../data/slug.ts";

export const VALIK_FIELDS: readonly { field: string; slug: string }[] = Object.freeze(
  [...Object.keys(FIELD_ISCED), FIELD_OTHER].map((field) => ({ field, slug: slugify(field) }))
);

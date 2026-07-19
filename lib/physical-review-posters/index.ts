import { FRIDAY } from "./friday";
import { SATURDAY } from "./saturday";
import { SUNDAY } from "./sunday";
import { MONDAY } from "./monday";
import { TUESDAY } from "./tuesday";
export type { Item, Poster } from "./types";
export const POSTERS = { ...FRIDAY, ...SATURDAY, ...SUNDAY, ...MONDAY, ...TUESDAY };

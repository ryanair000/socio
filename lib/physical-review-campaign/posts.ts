import { POSTS_A } from "./posts-a";
import { POSTS_B } from "./posts-b";
export const PHYSICAL_REVIEW_POSTS = [...POSTS_A, ...POSTS_B] as const;

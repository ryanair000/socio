import { randomUUID } from "node:crypto";
import { getActivePublisherCredential } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { ensureTikTokSchema } from "@/lib/schema";

const SOURCE_WEEK = "2026-07-20/2026-07-26";

const CAMPAIGN = [
  {
    sourceRef: "monday-1930-cheza-points-live",
    title: "Cheza Points Are Live",
    caption: `Your next game just got closer. 🎮

Create a new ChezaHub account before checkout and begin with 470 Cheza Points. Earn 1 point for every KSh10 spent on eligible paid games, disk games, gadgets and accessories.

Visit the Rewards page through our link in bio.

Cheza Points convert only to Cheza Credit for eligible ChezaHub purchases.

#ChezaHub #ChezaPoints #GamingKenya #KenyanGamers`,
    scheduledAt: "2026-07-20T16:30:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_cheza_points_are_live.jpg",
    imagePathname: "external/cheza-points-2026-07/01_cheza_points_are_live.jpg",
  },
  {
    sourceRef: "tuesday-1930-first-cheza-credit",
    title: "470 Plus 30 Equals 500",
    caption: `New member? You begin only 30 points away from your first Cheza Credit conversion.

Create your account, spend KSh300 on eligible paid merchandise and earn 30 points after payment confirmation. Your 500 points can then become KSh50 Cheza Credit.

Start through the link in bio.

Cheza Credit is not withdrawable or exchangeable for cash or M-Pesa.

#ChezaHub #ChezaPoints #GamingDealsKE #GamingKenya`,
    scheduledAt: "2026-07-21T16:30:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_470_plus_30_equals_500.jpg",
    imagePathname: "external/cheza-points-2026-07/01_470_plus_30_equals_500.jpg",
  },
  {
    sourceRef: "wednesday-1300-eligible-purchases",
    title: "What Earns Cheza Points",
    caption: `Save this Cheza Points guide. 🎮

Eligible paid games, disk games, gadgets and accessories earn 1 point per KSh10.

Gift cards, gaming wallet top-ups, Fortnite items, delivery charges and fees are excluded.

Create your account before paying so your eligible purchase can be connected to your Cheza Points balance.

#ChezaHub #ChezaPoints #KenyanGamers #GamingKenya`,
    scheduledAt: "2026-07-22T10:00:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_what_earns_cheza_points.jpg",
    imagePathname: "external/cheza-points-2026-07/01_what_earns_cheza_points.jpg",
  },
  {
    sourceRef: "thursday-1930-points-check-quiz",
    title: "Cheza Points Calculation",
    caption: `No calculator—just gamer maths. 👀

A KSh2,500 eligible purchase earns how many Cheza Points?

A: 25
B: 250
C: 2,500

Drop your answer in the comments.

#ChezaHub #ChezaPoints #GamingQuiz #KenyanGamers`,
    scheduledAt: "2026-07-23T16:30:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_points_check_quiz.jpg",
    imagePathname: "external/cheza-points-2026-07/01_points_check_quiz.jpg",
  },
  {
    sourceRef: "friday-1900-refer-your-squad",
    title: "Give 250 Get 500",
    caption: `Your squad should not game without rewards. 🎮

Share your personal Refer Your Squad link. When a genuinely new gamer completes their first eligible paid order of at least KSh2,000 within 30 days:

Your friend receives 250 points.
You receive 500 points.

Open Cheza Rewards through the link in bio and get your squad link.

#ChezaHub #ReferYourSquad #ChezaPoints #GamingKenya`,
    scheduledAt: "2026-07-24T16:00:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_refer_your_squad.jpg",
    imagePathname: "external/cheza-points-2026-07/01_refer_your_squad.jpg",
  },
  {
    sourceRef: "saturday-1230-no-expiry",
    title: "No Expiry No Pressure",
    caption: `Build your balance at your own pace.

Available Cheza Points do not expire under the current programme rules. Once you reach 500 points, you can convert them into Cheza Credit and view the transaction in your wallet.

Cheza Credit is closed-loop promotional value for eligible ChezaHub purchases. It cannot be withdrawn, transferred or exchanged for cash.

#ChezaHub #ChezaPoints #ChezaWallet #GamingKenya`,
    scheduledAt: "2026-07-25T09:30:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_no_expiry_no_pressure.jpg",
    imagePathname: "external/cheza-points-2026-07/01_no_expiry_no_pressure.jpg",
  },
  {
    sourceRef: "sunday-1930-choose-reward-level",
    title: "Choose Your Cheza Credit Target",
    caption: `Choose your Cheza Points target. 🔥

Would you save towards KSh50, KSh100, KSh250, KSh500 or KSh1,000 Cheza Credit?

Comment your target below, then start building your balance through eligible ChezaHub purchases.

Cheza Credit may cover up to 25% of eligible merchandise in an order, with at least KSh50 remaining payable through another payment method.

#ChezaHub #ChezaPoints #KenyanGamers #GamingRewards`,
    scheduledAt: "2026-07-26T16:30:00.000Z",
    imageUrl:
      "https://socio.jengasites.com/campaigns/cheza-points-2026-07/01_choose_your_reward_level.jpg",
    imagePathname: "external/cheza-points-2026-07/01_choose_your_reward_level.jpg",
  },
] as const;

export async function ensureChezaPointsLaunchCampaign() {
  await ensureTikTokSchema();
  const sql = getSql();
  const credential = await getActivePublisherCredential();
  const inserted: string[] = [];
  const existing: string[] = [];

  for (const post of CAMPAIGN) {
    const found = await sql`SELECT id FROM posts
      WHERE source_ref = ${post.sourceRef}
      LIMIT 1`;

    if (found[0]) {
      existing.push(String(found[0].id));
      continue;
    }

    const id = randomUUID();
    await sql.transaction([
      sql`INSERT INTO posts (
        id, title, caption, brand, image_url, image_pathname, post_format, status,
        scheduled_at, schedule_version, publisher_credential_id, qa_status,
        hold_reason, source_week, source_ref, approved_at
      ) VALUES (
        ${id}, ${post.title}, ${post.caption}, 'chezahub', ${post.imageUrl},
        ${post.imagePathname}, 'single', 'draft', ${post.scheduledAt}, 0, NULL,
        'ready', NULL, ${SOURCE_WEEK}, ${post.sourceRef}, now()
      )`,
      sql`INSERT INTO post_media (post_id, position, image_url, image_pathname)
        VALUES (${id}, 0, ${post.imageUrl}, ${post.imagePathname})`,
      sql`INSERT INTO post_targets (post_id, platform, status, idempotency_key)
        VALUES (${id}, 'instagram', 'draft', ${`${id}:instagram`})`,
    ]);
    inserted.push(id);
  }

  return {
    inserted,
    existing,
    total: CAMPAIGN.length,
    publisherCredentialAvailable: Boolean(credential),
  };
}

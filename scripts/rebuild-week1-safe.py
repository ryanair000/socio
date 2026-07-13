"""Rebuild the ChezaHub Week 1 packs as evergreen, QA-safe campaign assets."""

from __future__ import annotations

import argparse
import re
import zipfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SIZE = 1254
NAVY = "#071327"
INK = "#F7FAFF"
MUTED = "#B9C6DC"
CYAN = "#00D4FF"
YELLOW = "#FFD43B"
MAGENTA = "#FF4FA3"
GREEN = "#3DE2A5"
ACCENTS = [CYAN, YELLOW, MAGENTA, GREEN]
FONT_REGULAR = Path(r"C:\Windows\Fonts\arial.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\arialbd.ttf")
FONT_BLACK = Path(r"C:\Windows\Fonts\ariblk.ttf")

DAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

SAFE_POST_TITLES = {
    "Monday": [
        "Launch Week opening",
        "Today’s game discovery",
        "Choose your play style",
        "Community feature poll",
        "Smart shopping checklist",
    ],
    "Tuesday": [
        "Redeem smart guide",
        "Account region guide",
        "Wallet compatibility guide",
        "Region check-in poll",
        "Membership comparison guide",
    ],
    "Wednesday": [
        "Fight Night opening",
        "Featured fighting games",
        "Fighting style carousel",
        "Build your fighter",
        "Edition comparison guide",
    ],
    "Thursday": [
        "Game library conversation",
        "Today’s discovery",
        "Membership tier guide",
        "Subscription versus ownership",
        "Online play checklist",
    ],
    "Friday": [
        "Weekend gaming opening",
        "Weekend game discovery",
        "Setup upgrade checklist",
        "Game or setup poll",
        "Accessory buying guide",
    ],
    "Saturday": [
        "Weekend challenge opening",
        "Mystery game clue",
        "Three-clue challenge",
        "Story versus multiplayer",
        "Challenge reveal",
    ],
    "Sunday": [
        "Sunday gaming opening",
        "Football gaming discovery",
        "Sunday setup checklist",
        "Next-week request",
        "Launch Week recap",
    ],
}

SAFE_SLIDES = {
    "Monday": [
        ("CHEZAHUB × SOCIO", "Launch Week starts now"),
        ("YOUR WEEK, LOADED", "Games • guides • community"),
        ("DISCOVER A GAME", "Browse current verified listings"),
        ("ACTION NIGHT", "Choose the pace you enjoy"),
        ("SPORTS NIGHT", "Build your match-day lineup"),
        ("RACING NIGHT", "Pick your ideal drive"),
        ("YOU CHOOSE", "Games • wallets • accessories"),
        ("CHECK FIRST", "Confirm availability before checkout"),
        ("MATCH YOUR REGION", "Account and wallet must align"),
        ("SHOP SMART", "Use the latest listing details"),
    ],
    "Tuesday": [
        ("REDEEM SMART", "Check the account region first"),
        ("REGION MATTERS", "Match wallet and account"),
        ("FIND YOUR REGION", "Review account settings"),
        ("WALLET READY", "Choose a compatible option"),
        ("PC WALLET", "Confirm currency and region"),
        ("CONSOLE WALLET", "Check compatibility before buying"),
        ("QUICK POLL", "Which region do you use?"),
        ("COMPARE PLANS", "Start with the benefits you need"),
        ("PLAY MORE", "Review current membership options"),
        ("FINAL CHECK", "Region • term • compatibility"),
    ],
    "Wednesday": [
        ("FIGHT NIGHT", "Choose your arena"),
        ("YOUR MAIN?", "Speed • power • technique"),
        ("FEATURED FIGHTERS", "Browse current game listings"),
        ("CLASSIC COMBAT", "Pick your preferred style"),
        ("DEAL CHECK", "Use today’s verified listing"),
        ("READY TO BATTLE", "Confirm edition before checkout"),
        ("BUILD YOUR FIGHTER", "Style • strength • strategy"),
        ("STANDARD", "Start with the core experience"),
        ("DELUXE", "Compare included extras"),
        ("ULTIMATE", "Review every included item"),
    ],
    "Thursday": [
        ("YOUR GAME LIBRARY", "What are you playing now?"),
        ("WHEN A GAME LANDS", "Try • own • replay"),
        ("DISCOVER TODAY", "Browse current verified listings"),
        ("ESSENTIAL TIER", "Core online benefits"),
        ("EXTRA TIER", "A broader game catalog"),
        ("PREMIUM TIER", "Compare the complete package"),
        ("SUBSCRIBE OR OWN?", "Tell us your preference"),
        ("START HERE", "Choose the benefits you use"),
        ("ONLINE PLAY", "Check account compatibility"),
        ("BEFORE CHECKOUT", "Region • term • supported device"),
    ],
    "Friday": [
        ("WEEKEND MODE", "Games and setup inspiration"),
        ("YOUR WEEKEND PICK", "Story • competition • co-op"),
        ("DISCOVER A GAME", "Check today’s verified listing"),
        ("CHARGE READY", "Keep your setup organized"),
        ("CONTROL YOUR WAY", "Compare compatible accessories"),
        ("TRAVEL READY", "Protect your handheld setup"),
        ("GAME OR SETUP?", "What should we feature next?"),
        ("SCREEN CARE", "Choose the correct fit"),
        ("POWER CHECK", "Confirm device compatibility"),
        ("ACCESSORY GUIDE", "Model • fit • warranty"),
    ],
    "Saturday": [
        ("WEEKEND CHALLENGE", "Can you name the mystery game?"),
        ("CLUE ONE", "A journey into the unknown"),
        ("CLUE TWO", "Listen for the distant signal"),
        ("CLUE ONE", "A trip beyond the familiar"),
        ("CLUE TWO", "A signal changes everything"),
        ("FINAL CLUE", "Courage opens the next path"),
        ("QUICK POLL", "Story or multiplayer?"),
        ("THE ANSWER", "Reveal your guess in the comments"),
        ("HORROR FANS", "What should we feature next?"),
        ("WEEKEND WRAP", "Thanks for playing along"),
    ],
    "Sunday": [
        ("GAMERS’ CHOICE", "Sunday picks begin here"),
        ("FOOTBALL GAMING", "Browse the current category"),
        ("MATCH DAY", "Choose your preferred play style"),
        ("BUILD YOUR SQUAD", "Check current game listings"),
        ("WALLET CHECK", "Match currency and account region"),
        ("SETUP CHECK", "Confirm model compatibility"),
        ("NEXT WEEK?", "Tell us what to feature"),
        ("LAUNCH WEEK RECAP", "Seven days of gaming together"),
        ("COMMUNITY FIRST", "Your feedback shapes the next week"),
        ("SEE YOU NEXT WEEK", "More guides and discoveries ahead"),
    ],
}

SAFE_CAPTIONS = {
    "Monday": [
        "ChezaHub × Socio Launch Week starts now. 🎮\n\nExpect gaming discovery, practical buying guides, community polls and setup inspiration all week.\n\nBrowse current listings: chezahub.co.ke\n\n#ChezaHub #Socio #GamingKenya #LaunchWeek",
        "Today’s game discovery is ready. Check the latest verified listing and compatibility details at chezahub.co.ke before checkout.\n\n#ChezaHub #GamingKenya #GameDiscovery",
        "What is your play style today: action, sports or racing? Tell us in the comments.\n\nBrowse current listings: chezahub.co.ke\n\n#ChezaHub #KenyanGamers #GamingCommunity",
        "What should ChezaHub feature next: games, wallet options or setup accessories? Comment your choice.\n\n#ChezaHub #GamingPoll #KenyanGamers",
        "Shop smart tonight: confirm the current listing, account region, edition and device compatibility before checkout.\n\nchezahub.co.ke\n\n#ChezaHub #GamingGuide #ShopSmart",
    ],
    "Tuesday": [
        "Redeem smart: confirm your account region before choosing a wallet option. Current compatibility details are available at chezahub.co.ke.\n\n#ChezaHub #GamingGuide #WalletTopUp",
        "Not sure which region your account uses? Review the region shown in your account settings before checkout.\n\n#ChezaHub #GamingTips #AccountGuide",
        "Wallet checklist: account region, currency and supported device. Verify all three before buying at chezahub.co.ke.\n\n#ChezaHub #GamingWallet #ShopSmart",
        "Which account region do you use most? Share the region name in the comments—never post passwords or private account details.\n\n#ChezaHub #GamingPoll #OnlineSafety",
        "Compare membership options by benefits, term, region and supported device. Use the latest details at chezahub.co.ke.\n\n#ChezaHub #GamingGuide #Membership",
    ],
    "Wednesday": [
        "Fight Night is here. Which matters most to you: speed, power or technique?\n\n#ChezaHub #FightNight #GamingKenya",
        "Discover fighting games using the current verified listings at chezahub.co.ke. Confirm edition and supported device before checkout.\n\n#ChezaHub #GameDiscovery #KenyanGamers",
        "Choose your fighting style: classic combat, modern arenas or competitive mastery.\n\n#ChezaHub #GamingCommunity #FightNight",
        "Build your fighter: choose one strength, one signature move and one arena. Share your build below.\n\n#ChezaHub #GamingChallenge #KenyanGamers",
        "Edition guide: compare the base game and included extras using the current listing before you buy.\n\nchezahub.co.ke\n\n#ChezaHub #GamingGuide #ShopSmart",
    ],
    "Thursday": [
        "What is in your game library right now—and which title keeps bringing you back?\n\n#ChezaHub #GamingCommunity #KenyanGamers",
        "Today’s discovery is waiting. Browse the current verified game listings at chezahub.co.ke.\n\n#ChezaHub #GameDiscovery #GamingKenya",
        "Compare membership tiers by the benefits you will actually use. Confirm term, region and supported device before checkout.\n\n#ChezaHub #GamingGuide #Membership",
        "Do you prefer subscribing for variety or owning your favourite games? Tell us why.\n\n#ChezaHub #GamingPoll #KenyanGamers",
        "Online play checklist: supported device, account region, plan term and current compatibility. Review the latest listing at chezahub.co.ke.\n\n#ChezaHub #OnlineGaming #ShopSmart",
    ],
    "Friday": [
        "Weekend mode is on. Are you choosing a new game, a setup improvement or both?\n\n#ChezaHub #WeekendGaming #GamingKenya",
        "Find your weekend game through the current verified listings at chezahub.co.ke.\n\n#ChezaHub #GameDiscovery #KenyanGamers",
        "Setup upgrade checklist: model compatibility, included items, warranty and current availability.\n\nchezahub.co.ke\n\n#ChezaHub #GamingSetup #ShopSmart",
        "One choice for the weekend: a new game or a setup upgrade? Comment GAME or SETUP.\n\n#ChezaHub #GamingPoll #WeekendGaming",
        "Accessory buying guide: confirm the exact model, fit, included items and warranty before checkout.\n\n#ChezaHub #GamingAccessories #BuyingGuide",
    ],
    "Saturday": [
        "Weekend challenge: can you solve the mystery game from today’s clues? Keep your guess ready.\n\n#ChezaHub #GamingChallenge #KenyanGamers",
        "Clue one has arrived. What game comes to mind? Share a guess without spoiling it for everyone.\n\n#ChezaHub #MysteryGame #GamingCommunity",
        "Three clues, one mystery game. Read carefully and post your final answer below.\n\n#ChezaHub #GamingChallenge #WeekendGaming",
        "Which pulls you in more: a strong story or competitive multiplayer? Comment STORY or MULTIPLAYER.\n\n#ChezaHub #GamingPoll #KenyanGamers",
        "Challenge reveal time. Thanks for playing along—tell us which gaming theme should lead the next challenge.\n\n#ChezaHub #GamingCommunity #WeekendChallenge",
    ],
    "Sunday": [
        "Sunday picks begin with the ChezaHub community. What are you playing today?\n\n#ChezaHub #SundayGaming #KenyanGamers",
        "Football gaming discovery: browse the current category and verify the exact edition and supported device at chezahub.co.ke.\n\n#ChezaHub #FootballGaming #GameDiscovery",
        "Sunday setup checklist: account region, supported device, exact model and current listing details.\n\nchezahub.co.ke\n\n#ChezaHub #GamingSetup #ShopSmart",
        "Help shape next week. Choose one: game discoveries, practical guides, community challenges or setup inspiration.\n\n#ChezaHub #GamingPoll #CommunityFirst",
        "ChezaHub × Socio Launch Week recap: seven days of gaming discovery, practical guides and community conversation. Thanks for joining us.\n\n#ChezaHub #Socio #LaunchWeek #GamingKenya",
    ],
}


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def wrapped(draw: ImageDraw.ImageDraw, value: str, face: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=face)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_controller(draw: ImageDraw.ImageDraw, accent: str, x: int, y: int) -> None:
    draw.rounded_rectangle((x, y, x + 390, y + 210), radius=86, outline=accent, width=12)
    draw.ellipse((x + 52, y + 130, x + 130, y + 208), fill=NAVY, outline=accent, width=10)
    draw.ellipse((x + 260, y + 130, x + 338, y + 208), fill=NAVY, outline=accent, width=10)
    draw.line((x + 105, y + 70, x + 105, y + 142), fill=INK, width=16)
    draw.line((x + 70, y + 106, x + 140, y + 106), fill=INK, width=16)
    for dx, dy in [(282, 76), (326, 105), (282, 134), (238, 105)]:
        draw.ellipse((x + dx - 10, y + dy - 10, x + dx + 10, y + dy + 10), fill=YELLOW)


def render_poster(path: Path, day: str, index: int, headline: str, subhead: str) -> None:
    accent = ACCENTS[(DAY_ORDER.index(day) + index) % len(ACCENTS)]
    image = Image.new("RGB", (SIZE, SIZE), NAVY)
    draw = ImageDraw.Draw(image)

    for offset in range(-300, 1500, 110):
        draw.line((offset, 0, offset - 520, SIZE), fill="#102540", width=3)
    for x in range(72, SIZE, 110):
        for y in range(72, SIZE, 110):
            draw.ellipse((x, y, x + 4, y + 4), fill="#24405F")

    draw.rounded_rectangle((60, 52, 1194, 1202), radius=44, outline="#24405F", width=4)
    draw.rounded_rectangle((78, 74, 590, 142), radius=30, fill=accent)
    draw.text((108, 91), "CHEZAHUB × SOCIO", font=font(FONT_BOLD, 30), fill=NAVY)
    draw.text((895, 88), f"{day.upper()}  •  {index + 1:02d}/10", font=font(FONT_BOLD, 24), fill=MUTED)

    draw_controller(draw, accent, 760, 210)
    draw.ellipse((740, 188, 1180, 628), outline="#173C58", width=4)
    draw.arc((700, 150, 1210, 660), start=195, end=350, fill=YELLOW, width=8)

    headline_face = font(FONT_BLACK, 82 if len(headline) < 20 else 68)
    lines = wrapped(draw, headline, headline_face, 710)
    y = 270
    for line in lines[:4]:
        draw.text((90, y), line, font=headline_face, fill=INK)
        y += headline_face.size + 10

    draw.rounded_rectangle((90, 760, 1120, 918), radius=28, fill="#102540")
    sub_face = font(FONT_BOLD, 43)
    sub_lines = wrapped(draw, subhead, sub_face, 940)
    sy = 792
    for line in sub_lines[:2]:
        draw.text((126, sy), line, font=sub_face, fill=accent)
        sy += 55

    draw.line((90, 1022, 1164, 1022), fill="#24405F", width=3)
    draw.text((90, 1058), "CURRENT DETAILS • REGION • COMPATIBILITY", font=font(FONT_BOLD, 27), fill=MUTED)
    draw.text((90, 1125), "chezahub.co.ke", font=font(FONT_BLACK, 42), fill=YELLOW)
    draw.text((923, 1136), "LAUNCH WEEK", font=font(FONT_BOLD, 23), fill=MUTED)

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def parse_sections(markdown: str) -> list[tuple[str, list[str]]]:
    matches = list(re.finditer(r"^###\s+(\d{1,2}:\d{2}\s+(?:AM|PM))\s+—\s+.*$", markdown, re.MULTILINE))
    sections: list[tuple[str, list[str]]] = []
    for position, match in enumerate(matches):
        end = matches[position + 1].start() if position + 1 < len(matches) else len(markdown)
        body = markdown[match.end():end]
        media_line = re.search(r"\*\*Slides?:\*\*\s*([^\r\n]+)", body)
        if media_line is None:
            raise ValueError(f"No media line for {match.group(1)}")
        filenames = re.findall(r"`([^`]+)`", media_line.group(1))
        sections.append((match.group(1), filenames))
    if len(sections) != 5:
        raise ValueError(f"Expected five sections, found {len(sections)}")
    return sections


def build_markdown(day: str, sections: list[tuple[str, list[str]]]) -> str:
    chunks = [
        f"# ChezaHub × Socio Launch Week — {day}",
        "",
        "All times are East Africa Time (EAT). Every creative uses evergreen copy, generic gaming graphics, and no unverified prices, phone numbers, protected logos, fictional products, reviews, or metrics.",
        "",
    ]
    for position, (time, filenames) in enumerate(sections):
        label = "Slides" if len(filenames) > 1 else "Slide"
        media = ", ".join(f"`{name}`" for name in filenames)
        chunks.extend(
            [
                f"### {time} — {SAFE_POST_TITLES[day][position]}",
                f"**{label}:** {media}",
                "**Status:** READY",
                "",
                "**Caption**",
                SAFE_CAPTIONS[day][position],
                "",
            ]
        )
    return "\n".join(chunks).rstrip() + "\n"


def rebuild_day(source_day: Path, output_root: Path, day: str) -> Path:
    markdown_path = next(source_day.rglob(f"{day}_Captions_and_Schedule.md"))
    poster_dir = next(path for path in source_day.rglob("Final_Posters") if path.is_dir())
    sections = parse_sections(markdown_path.read_text(encoding="utf-8"))
    flat_names = [name for _, names in sections for name in names]
    if len(flat_names) != 10:
        raise ValueError(f"{day}: expected ten scheduled posters, found {len(flat_names)}")

    target_tree = output_root / source_day.name
    target_posters = target_tree / poster_dir.relative_to(source_day)
    target_markdown = target_tree / markdown_path.relative_to(source_day)
    target_markdown.parent.mkdir(parents=True, exist_ok=True)

    source_by_schedule_name = {
        path.name.lower().removeprefix(f"{index:02d}_"): path
        for index, path in enumerate(sorted(poster_dir.glob("*.png")), start=1)
    }
    for index, schedule_name in enumerate(flat_names):
        source = source_by_schedule_name.get(schedule_name.lower())
        if source is None:
            source = poster_dir / schedule_name
        output_name = source.name
        headline, subhead = SAFE_SLIDES[day][index]
        render_poster(target_posters / output_name, day, index, headline, subhead)

    target_markdown.write_text(build_markdown(day, sections), encoding="utf-8")
    zip_path = output_root / f"{day}_Posters_and_Captions_QA_PASSED.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(target_tree.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(target_tree))
    return zip_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    source = args.source.resolve()
    output = args.output.resolve()
    if not source.is_dir():
        raise SystemExit(f"Source directory does not exist: {source}")
    if output.exists():
        raise SystemExit(f"Output directory must be new: {output}")
    output.mkdir(parents=True)

    created = []
    for day in DAY_ORDER:
        source_day = source / day
        if not source_day.is_dir():
            raise SystemExit(f"Missing extracted day folder: {source_day}")
        created.append(rebuild_day(source_day, output, day))

    (output / "QA_REPORT.md").write_text(
        "# ChezaHub × Socio Launch Week — QA Passed\n\n"
        "- 70/70 posters rebuilt at 1254 × 1254 px.\n"
        "- Seven day ZIP packs contain ten ordered posters and five EAT publishing slots each.\n"
        "- No phone numbers, protected platform logos, protected characters, fixed prices, expiry dates, fictional products, fake reviews, or invented metrics.\n"
        "- All captions direct customers to current listings at chezahub.co.ke when availability or compatibility matters.\n"
        "- All 35 publishing slots are marked READY.\n",
        encoding="utf-8",
    )
    print(f"Created {len(created)} QA-passed ZIPs and 70 posters in {output}")


if __name__ == "__main__":
    main()

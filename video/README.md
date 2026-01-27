# WaaS Promo Videos

Remotion-powered promotional videos for the Website-as-a-Service agency.

## Quick Start

```bash
# Preview all videos in browser
bun run video:preview

# Render all 5 videos
bun run video:render:all
```

## 5 Video Versions

| # | ID | Dimensions | Duration | Use Case |
|---|---|---|---|---|
| 1 | `Promo-Main` | 1920x1080 | 26s | Website, YouTube, LinkedIn |
| 2 | `Promo-Dark` | 1920x1080 | 26s | Dark mode variant |
| 3 | `Promo-Vertical` | 1080x1920 | 17s | TikTok, Instagram Reels |
| 4 | `Promo-Square` | 1080x1080 | 17s | Instagram Feed, Facebook |
| 5 | `Promo-Short` | 1920x1080 | 15s | Quick ads, pre-roll |

## Video Structure

Each video follows a clear **Intro → Content → Outro** structure:

1. **Intro** - Hook: "Your Website. Your Web Team."
2. **Pain Points** - Problems your ICP faces (slow, outdated, overpriced)
3. **Solution** - Hero image showcase with "We build it. We run it."
4. **Features** - Key benefits (PageSpeed, unlimited edits, domain, analytics)
5. **Outro** - CTA with pricing ($0 down, $199/mo)

## Render Commands

```bash
bun run video:render           # Main promo (1920x1080)
bun run video:render:dark      # Dark mode (1920x1080)
bun run video:render:vertical  # TikTok/Reels (1080x1920)
bun run video:render:square    # Instagram Feed (1080x1080)
bun run video:render:short     # Quick ad (1920x1080)
bun run video:render:all       # All 5 videos
```

Output files go to `out/` directory.

## Project Structure

```
video/
├── public/
│   ├── heroimg.png          # Main hero image
│   └── heroimgold.png       # Alternative hero image
├── src/
│   ├── index.ts             # Entry point
│   ├── Root.tsx             # All 5 compositions
│   ├── PromoVideo.tsx       # Main + Dark (1920x1080)
│   ├── PromoVertical.tsx    # TikTok/Reels (1080x1920)
│   ├── PromoSquare.tsx      # Instagram Feed (1080x1080)
│   └── PromoShort.tsx       # Quick ad (1920x1080)
├── remotion.config.ts
└── tsconfig.json
```

## Customization

### Change Hero Image
Edit `video/src/Root.tsx` and change the `heroImage` prop:
```tsx
heroImage: "heroimgold.png"  // or "heroimg.png"
```

### Change Brand Colors
Edit the `brandColors` object in `video/src/Root.tsx`:
```tsx
const brandColors: BrandColors = {
  primary: "#0f172a",    // Background dark
  accent: "#3b82f6",     // Blue highlights
  highlight: "#22c55e",  // Green CTAs
  background: "#ffffff",
  text: "#0f172a",
};
```

### Change Copy/Text
Edit the scene components in each `Promo*.tsx` file.

## Key Messaging

- **Hook:** "Your Website. Your Web Team."
- **Pain Points:** Slow? Outdated? Overpriced?
- **Solution:** "We build it. We run it. You grow."
- **Pricing:** $0 Down • $199/mo
- **CTA:** "Get Started" / "Ready to stand out?"

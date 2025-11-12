# Hero Image Design Guide - Acadiana Web Design

## Agency Positioning
- **Business**: Acadiana Web Design
- **Service**: Done-for-you website and hosting for local service businesses
- **Pricing**: $199/mo, $0 down
- **Timeline**: 72-hour go-live from build
- **Support**: Unlimited edit requests via client portal
- **Location**: Serving Acadiana region

## Target Audience
- **Business Type**: Local service companies
- **Industries**: Plumbing, landscaping, painting, home services
- **Role**: Business owners and service contractors
- **Location**: Acadiana, Louisiana

## Layout Specifications
- **Desktop**: 16:9 aspect ratio
- **Mobile**: 16:9 aspect ratio
- **Container**: max-w-6xl (1152px)
- **Border Radius**: rounded-xl (0.625rem)

## Color System
### Light Theme Values
- **Background**: hsl(225 38% 95%)
- **Primary**: hsl(215 85% 55%)
- **Accent**: hsl(215 56% 92%)
- **Text**: hsl(225 30% 35%)
- **Muted**: hsl(225 20% 92%)

### Dark Theme Values
- **Background**: hsl(220 28% 11%)
- **Primary**: hsl(215 80% 60%)
- **Text**: hsl(0 0% 100%)

## Gradient System
**Hero Gradient Light**:
```
radial-gradient(1200px 600px at 80% -10%, hsl(215 85% 55% / 0.30) 0%, transparent 60%),
radial-gradient(900px 480px at -10% 20%, hsl(215 56% 92% / 0.24) 0%, transparent 60%)
```

**Page Gradient Light**:
```
radial-gradient(1800px 1000px at 50% -15%, hsl(215 85% 55% / 0.62) 0%, transparent 82%),
linear-gradient(180deg, hsl(215 85% 55% / 0.36) 0%, transparent 45%)
```

## Typography Context
- **H1**: "A 5-Star Website for Your Business in Acadiana"
- **Subhead**: "Done-for-you website and hosting. Unlimited edit requests via the client portal. Built to bring in calls."
- **Benefits**: "$199/mo • $0 down", "72-hour go-live from build", "Unlimited edit requests via the client portal"

## Visual Context
- **Setting**: Local service business environments
- **Devices**: Modern smartphones and laptops
- **Lighting**: Natural, soft shadows
- **Style**: Professional tradesman atmosphere
- **Location Elements**: Subtle Acadiana regional context

## Overlay & Safe Areas
- **Overlay behavior**: On medium screens and larger, a frosted glass panel sits over the bottom of the image inside the hero card (backdrop blur + saturation). On small screens, the panel is below the image (not overlayed).
- **Reserve negative space**: Keep the bottom 28–38% of the image low‑detail/low‑contrast so the overlay’s star rating, subheading, and plan bullets remain legible.
- **Subject placement**:
  - Keep key subjects within the central 40–60% vertically and central 60% horizontally.
  - Avoid critical details in the bottom‑left region (under stars/heading) and near rounded corners.
- **Rounded corners**: Leave ~12–16px visual breathing room from all edges to avoid clipping behind `rounded‑xl` (0.625rem).

## Aspect Ratios & Cropping
- **Primary**: 16:9 for both desktop and mobile (matches current implementation).
- **Optional ultra‑wide**: If needed later, crop the same 16:9 master to 32:9 via `object-cover`. Keep the subject centered vertically; avoid important content at extreme top/bottom.
- **Safe composition**: Favor a centered cluster of devices/cards so top/bottom crops remain graceful.

## Dark Mode Considerations
Provide a neutral/soft palette that works in light and dark themes. Suggested dark variant beams:
```
radial-gradient(1200px 600px at 80% -10%, hsl(215 80% 60% / 0.18) 0%, transparent 60%),
radial-gradient(900px 480px at -10% 20%, hsl(220 28% 11% / 0.40) 0%, transparent 60%)
```
- Avoid pure whites; prefer soft highlights to reduce haloing against dark backgrounds.
- Keep bottom area especially simple so overlay text stays readable in both themes.

## Prompt Ingredients (for AI generation)
Include the following; avoid baked‑in text or logos.
- **Style**: soft off‑white background, visible gradient beams, frosted glass panels, clean studio lighting, no text/logos; avoid photoreal faces (prefer stylized or back/3‑4 view)
- **Subject**: laptop + phone showing a generic service‑business website UI, or floating UI cards; optional speed gauge 95+ motif; optional subtle service tools (wrench, brush, shears)
- **Mood**: professional tradesman, local service vibe, subtle Acadiana nod (bayou silhouettes/moss), calm and trustworthy
- **Composition**: centralized subject, ample negative space at bottom, rounded corners safe area

Example seed (adapt to model):
“minimal studio scene, laptop and smartphone with a generic service‑business website UI, soft off‑white background with gentle azure→indigo gradient beams, subtle frosted glass panels, slight reflections, professional tradesman vibe, no text, no logos, stylized or back/3‑4 view (no photoreal face), subject centered, leave bottom 30% low‑detail for overlay”

## Character Concept: Blue‑Collar Tradesman with Acadiana Flag
- **Intent**: Local, hardworking identity that aligns with plumbing/landscaping/painting/home services while remaining brand‑safe and legible behind the frosted overlay.
- **Style**: Illustrated/animated or simplified 3D; clean shapes; avoid intricate textures that fight the overlay.
- **Face treatment**: Prefer faceless or stylized features; back or 3/4 view recommended. Avoid photoreal faces.
- **Flag**: Use a simplified Acadiana flag (clean geometric shapes, fabric motion). No text; no hyper‑detailed emblems.
- **Palette**: Start from off‑white base with azure→indigo beams; introduce subtle red/gold accents sampled from the flag.
- **Composition**: Center the figure; angle the flag up/right; reserve bottom 28–38% as low‑detail space; avoid important details near rounded corners.
- **Aspect & crops**: Generate 16:9; keep the subject center‑weighted so a later 32:9 crop via `object-cover` doesn’t cut key elements.

## Generator Prompt Recipes
### Midjourney (16:9 illustration)
“blue‑collar tradesman character with tool belt, holding an Acadiana flag, calm confident stance, soft off‑white background with visible azure→indigo gradient beams, tasteful red and gold accents, frosted‑glass vibe, professional tradesman atmosphere, no text, no logos, stylized face or 3/4 back view, subject centered, leave bottom 30% low‑detail for UI overlay, clean studio lighting, subtle depth of field —ar 16:9 —s 250”

### SDXL / ComfyUI (clean, semi‑real illustrative)
- Positive: “blue‑collar worker character, tool belt, holding Acadiana flag, soft off‑white background, visible gradient beams (azure→indigo) with red/gold accents, frosted‑glass highlights, professional tradesman vibe, stylized or faceless, centered composition, negative space at bottom”
- Negative: “text, logo, watermark, photoreal face, cluttered background, extreme contrast at bottom”
- Settings: 1536×864, 30–40 steps, CFG 5–6.5, sampler DPM++ 2M Karras

### DALL·E (composition‑aware, simplified)
“An illustrated blue‑collar tradesman with a tool belt, holding the Acadiana flag. Clean, modern, friendly style. Soft off‑white background with visible azure‑to‑indigo gradient beams and subtle red/gold accents. Centered subject with generous negative space at the bottom for UI overlay. No text, no logos, stylized or back/3‑4 view face.”

## Variations to Explore
- **Silhouette/back view**: Strong silhouette, flag billowing up/right; zero facial detail.
- **Torso crop**: Waist‑up with tool belt prominent; flag draped over shoulder; face out of frame.
- **Iconic minimal**: Simplified vector/low‑poly figure; bold shapes; maximum legibility behind overlay.

## Export & Performance
- **Master render**: 3840×2160 (16:9). Compose for center‑weighted subject.
- **Deliverable**: WebP (`.webp`) at 85–90 quality. Target ≤900 KB.
- **Fallback**: `.png` if needed; aim ≤1.5 MB.
- **Filename**: `/public/hero-16x9.webp` (master). Optional `/public/hero-16x9-dark.webp` if generating a distinct dark version.
- **No baked text**: Keep all copy in HTML for accessibility and crispness.

## Accessibility & Legal
- **Alt text**: Use “Website preview” (or `alt=""` if decorative and described elsewhere).
- **No logos/brand names**: Keep UI generic; avoid identifiable marks.
- **Faces**: Avoid photoreal faces; prefer stylized or back/3‑4 view; never resemble identifiable people.

## QA Checklist
- Overlay legibility on md+ (bottom 28–38% is calm/low‑detail).
- Looks good in light and dark themes without color clashes.
- Subject remains intact if later cropped to 32:9 via `object-cover`.
- Corners/edges free of important details; rounded corners don’t clip anything.
- File size/format optimized; no baked‑in text; devices/UI feel modern and generic.

# Gator Constructors — preview assets

The four JPGs in this folder are the real assets Charlie sent in Messenger.
The three work photos were supplied as Facebook viewer screenshots, then cropped
to remove the viewer interface and black bars before use in the preview.

Save Charlie's images from the Messenger thread over these exact filenames:

| File           | What it is                                                                  | Target size          |
| -------------- | --------------------------------------------------------------------------- | -------------------- |
| `logo.jpg`     | Gator Constructors logo — gator eyes over the wordmark, dark green on white | ~800 × 800, square   |
| `hero.jpg`     | Covered boat dock over the canal, camps along the far bank                  | 946 × 532, landscape |
| `plate-01.jpg` | L-head dock reaching out over open water                                    | 944 × 1260, portrait |
| `plate-02.jpg` | Wooden walkway running from the grass bank out to the dock platform         | 944 × 1260, portrait |

Notes:

- Keep `logo.jpg` on its **white background** — the masthead uses `mix-blend-mode: multiply`
  to drop the white plate onto the page's bone paper. A pre-cut transparent PNG would need
  that blend mode removed.
- `hero.jpg` is the LCP image and is not lazy-loaded. Keep it under ~250 KB.
- The plates crop to 21:9 on desktop and 3:2 on phones, so keep the dock roughly centred
  vertically or it will lose the top and bottom of the frame on wide screens.
- Alt text and captions live in `lib/lead-demos.ts` under `gator-constructors`. If you swap
  in a different photo, update the `alt` and `caption` there so they stay truthful.
- Do **not** use the Facebook ad graphic with the baked-in service list and phone number —
  the page sets that type itself.

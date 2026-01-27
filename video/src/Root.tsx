import { Composition, Folder } from "remotion";
import { PromoHorizontal } from "./PromoHorizontal";
import { PromoVertical } from "./PromoVertical";

const FPS = 30;
const DURATION_SECONDS = 15;

export const RemotionRoot = () => {
  return (
    <>
      <Folder name="Promo">
        {/* Horizontal - YouTube, Website, Ads (16:9) */}
        <Composition
          id="Promo-Horizontal"
          component={PromoHorizontal}
          durationInFrames={FPS * DURATION_SECONDS}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={{
            heroImage: "heroimg.png",
            theme: "light" as const,
          }}
        />

        {/* Vertical - TikTok, Instagram Reels, YouTube Shorts (9:16) */}
        <Composition
          id="Promo-Vertical"
          component={PromoVertical}
          durationInFrames={FPS * DURATION_SECONDS}
          fps={FPS}
          width={1080}
          height={1920}
          defaultProps={{
            heroImage: "heroimg.png",
            theme: "light" as const,
          }}
        />
      </Folder>
    </>
  );
};

# Social Creator Packs

Social creator work is now split by platform so activation can use the correct mechanics instead of a generic social prompt. Pick the platform pack that matches the target surface.

## Coverage

| Platform  | Pack                       | Representative Skills                                                                                                  |
| --------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| LinkedIn  | `CreatorPacks.linkedin()`  | `linkedin-audience-research`, `linkedin-ideation`, `linkedin-post-writer`, `linkedin-hook-review`, `linkedin-calendar` |
| X/Twitter | `CreatorPacks.xTwitter()`  | `x-topic-research`, `x-post-writer`, `x-thread-writer`, `x-community-reply-writer`                                     |
| Instagram | `CreatorPacks.instagram()` | `instagram-caption-writer`, `instagram-carousel-brief`, `instagram-reel-scriptwriter`, `instagram-visual-direction`    |
| TikTok    | `CreatorPacks.tiktok()`    | `tiktok-trend-research`, `tiktok-hook-writer`, `tiktok-scriptwriter`, `tiktok-safety-review`                           |
| Pinterest | `CreatorPacks.pinterest()` | `pinterest-keyword-research`, `pinterest-board-planner`, `pinterest-visual-brief`                                      |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(CreatorPacks.linkedin({ memory: true, readOnlyByDefault: true }));

const response = await agent.run({
  prompt:
    "/write-linkedin-post Turn this product insight into three LinkedIn post variants with different hooks.",
});
console.log(response.content);
```

For cross-platform adaptation, combine a source pack with `CreatorPacks.shortVideo()` or the exact destination platform pack rather than relying on a generic social pack.

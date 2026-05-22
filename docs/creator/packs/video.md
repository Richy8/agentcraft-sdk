# Video Creator Packs

Video work is split into platform-native packs because YouTube, TikTok, Shorts, webinars, and podcasts optimize for different retention mechanics.

## Coverage

| Surface     | Pack                        | Representative Skills                                                                                                                   |
| ----------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| YouTube     | `CreatorPacks.youtube()`    | `youtube-topic-research`, `youtube-title-thumbnail-brief`, `youtube-scriptwriter`, `youtube-retention-review`, `youtube-chapter-writer` |
| Short video | `CreatorPacks.shortVideo()` | `short-video-ideation`, `short-video-scriptwriter`, `short-video-shot-list`, `short-video-platform-adapter`                             |
| TikTok      | `CreatorPacks.tiktok()`     | `tiktok-trend-research`, `tiktok-hook-writer`, `tiktok-scriptwriter`, `tiktok-shot-list`                                                |
| Webinar     | `CreatorPacks.webinar()`    | `webinar-topic-research`, `webinar-outline-writer`, `webinar-slide-brief`, `webinar-followup-sequence`                                  |
| Podcast     | `CreatorPacks.podcast()`    | `podcast-topic-research`, `podcast-outline-writer`, `podcast-show-notes-writer`, `podcast-clip-repurposing`                             |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.gemini["gemini-2.5-pro"],
  apiKey: process.env.GOOGLE_API_KEY!,
  skillActivation: "auto",
}).use(CreatorPacks.youtube({ contentRoot: "./video", cache: "auto" }));

const response = await agent.run({
  prompt:
    "Plan a 7-minute YouTube video about production-grade agent testing, including title, thumbnail brief, script, retention risks, chapters, and description tags.",
});
console.log(response.content);
```

Use `CreatorPacks.shortVideo()` when the destination platform is undecided, then add `CreatorPacks.tiktok()` or `CreatorPacks.instagram()` when platform dynamics become important.

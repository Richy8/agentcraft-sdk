# Video Pack

The video pack covers ideation, script structure, creative direction, and repurposing. It is useful for YouTube, Shorts, course modules, webinars, and video-led campaigns.

## Coverage

| Stage    | Included skills      | Tools to attach                  | Purpose                                         |
| -------- | -------------------- | -------------------------------- | ----------------------------------------------- |
| Ideation | `video-ideation`     | `tavily`, `firecrawl`            | Find angles, hooks, and formats.                |
| Script   | `video-scriptwriter` | `filesystem`                     | Produce scripts, beats, and narration.          |
| Creative | `creative-direction` | `image-generation`, `elevenlabs` | Guide visuals, thumbnails, and audio direction. |
| Reuse    | `repurposing`        | `publishing`, `storage`          | Extract clips, posts, and summaries.            |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.gemini["gemini-2.5-pro"],
  apiKey: process.env.GOOGLE_API_KEY!,
}).use(CreatorPacks.video({ contentRoot: "./video", cache: "auto" }));

const response = await agent.run({
  prompt: "Plan a 7 minute YouTube video about production-grade agent testing.",
});
console.log(response.content);
```

## Configuration

| Option        | Required | Default       | Purpose                                      |
| ------------- | -------- | ------------- | -------------------------------------------- |
| `contentRoot` | No       | Undefined     | Stores scripts, beats, and asset notes.      |
| `cache`       | No       | `false`       | Reuses source research and audience notes.   |
| `memory`      | No       | `false`       | Applies channel voice and recurring formats. |
| `budget`      | No       | Agent default | Controls heavier ideation and script passes. |

## Examples

Pair the pack with an audio adapter when generating voice direction:

```ts
agent.use(
  ElevenLabsAdapter.connect({ apiKey: process.env.ELEVENLABS_API_KEY! }),
);
agent.use(CreatorPacks.video());
```

See [Creator Adapters](../adapters.md) and the [creator cookbook](../../examples-cookbook/creator.md).

# Specialized Adapters

Specialized adapters cover communication, productivity, and media workflows — email, calendar, spreadsheets, image generation, and text-to-speech. All are imported from `@deskcreate/agentcraft/adapters`.

## EmailAdapter

Send and template emails through SendGrid or Resend.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { EmailAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  EmailAdapter.connect({
    provider: "sendgrid",            // "sendgrid" | "resend" | "smtp"
    apiKey: process.env.SENDGRID_API_KEY!,
    from: "agent@yourapp.com",
    timeoutMs: 10_000,
  }),
);

const response = await agent.run({
  prompt: "Send a welcome email to user@example.com with subject 'Welcome to AgentCraft'.",
});
console.log(response.content);
```

### Config

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `provider` | Yes | — | `"sendgrid"`, `"resend"`, or `"smtp"` |
| `apiKey` | SendGrid / Resend | — | Provider API key |
| `from` | Yes | — | Sender email address |
| `host` | SMTP only | — | SMTP server hostname |
| `port` | SMTP only | — | SMTP server port |
| `timeoutMs` | No | `30000` | Per-request timeout |
| `onAuditEvent` | No | — | Callback for tool audit events |

### Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `send_email` | `write` (requires confirmation) | Send an email with HTML or plain text body |
| `send_template_email` | `write` (requires confirmation) | Send using a provider-stored template with variables |
| `list_templates` | `external` | List available email templates |

### Pattern: Approval-Gated Email

Email has a `write` side effect and `requiresConfirmation: true` by default — the model cannot send email without approval:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { EmailAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onApprovalRequest: async ({ toolName, args }) => {
      // Show preview to a human reviewer before sending
      console.log(`Approve ${toolName}?`, JSON.stringify(args, null, 2));
      const input = await promptUser("Approve? (y/n): ");
      return input.trim() === "y" ? "approved" : "denied";
    },
  },
}).use(
  EmailAdapter.connect({
    provider: "resend",
    apiKey: process.env.RESEND_API_KEY!,
    from: "agent@yourapp.com",
  }),
);
```

---

## GoogleCalendarAdapter

Read and write Google Calendar events.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GoogleCalendarAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GoogleCalendarAdapter.connect({
    credentials: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
    },
    defaultCalendarId: "primary",
  }),
);

const response = await agent.run({
  prompt: "What meetings do I have tomorrow?",
});
console.log(response.content);
```

### Config

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `credentials.clientId` | Yes | — | Google OAuth2 client ID |
| `credentials.clientSecret` | Yes | — | Google OAuth2 client secret |
| `credentials.refreshToken` | Yes | — | OAuth2 refresh token |
| `defaultCalendarId` | No | `"primary"` | Calendar to use when none is specified |
| `timeoutMs` | No | `30000` | Per-request timeout |

### Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `list_events` | `external` | List upcoming calendar events |
| `get_event` | `external` | Get a specific event by ID |
| `create_event` | `write` (requires confirmation) | Create a new calendar event |
| `update_event` | `write` (requires confirmation) | Update an existing event |
| `delete_event` | `write` (requires confirmation) | Delete a calendar event |

---

## GoogleSheetsAdapter

Read and write Google Sheets spreadsheets.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GoogleSheetsAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GoogleSheetsAdapter.connect({
    credentials: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
    },
    defaultSpreadsheetId: process.env.SPREADSHEET_ID,
  }),
);

const response = await agent.run({
  prompt: "Read the Q4 sales data from the 'Revenue' sheet and summarize the top 3 products.",
});
console.log(response.content);
```

### Config

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `credentials.clientId` | Yes | — | Google OAuth2 client ID |
| `credentials.clientSecret` | Yes | — | Google OAuth2 client secret |
| `credentials.refreshToken` | Yes | — | OAuth2 refresh token |
| `defaultSpreadsheetId` | No | — | Spreadsheet to use when none is specified |
| `timeoutMs` | No | `30000` | Per-request timeout |

### Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `read_range` | `external` | Read a cell range (e.g. `Sheet1!A1:C10`) |
| `write_range` | `write` (requires confirmation) | Write values to a cell range |
| `append_rows` | `write` (requires confirmation) | Append rows to a sheet |
| `get_spreadsheet_info` | `external` | List sheets and metadata |

---

## ImageGenerationAdapter

Generate images using OpenAI DALL-E or Stability AI.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ImageGenerationAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  ImageGenerationAdapter.connect({
    provider: "openai",             // "openai" | "stability"
    apiKey: process.env.OPENAI_API_KEY!,
    defaultSize: "1024x1024",
    defaultModel: "dall-e-3",
  }),
);

const response = await agent.run({
  prompt: "Generate a hero image for a blog post about TypeScript 5.x — modern, developer-focused aesthetic.",
});
console.log(response.content); // includes the image URL or base64 data
```

### Config

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `provider` | Yes | — | `"openai"` or `"stability"` |
| `apiKey` | Yes | — | Provider API key |
| `defaultModel` | No | Provider default | Default model (e.g. `"dall-e-3"`) |
| `defaultSize` | No | Provider default | Default image size (e.g. `"1024x1024"`) |
| `timeoutMs` | No | `30000` | Per-request timeout |

### Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `generate_image` | `external` | Generate an image from a text prompt |
| `edit_image` | `write` (requires confirmation) | Submit an image edit request |
| `generate_variations` | `external` | Generate variations of an existing image |

### Pattern: Content Pipeline With Image Generation

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ImageGenerationAdapter, PublishingAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(
    ImageGenerationAdapter.connect({
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY!,
      defaultSize: "1792x1024", // landscape for blog headers
    }),
  )
  .use(PublishingAdapter.connect());

const response = await agent.run({
  prompt: `
    Write a blog post about the benefits of semantic caching in AI pipelines.
    Generate a header image to accompany it.
    Publish the post with the image to the CMS.
  `,
});
```

---

## ElevenLabsAdapter

Generate audio narration and clone voices with ElevenLabs.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ElevenLabsAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  ElevenLabsAdapter.connect({
    apiKey: process.env.ELEVENLABS_API_KEY!,
    defaultVoiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
    defaultModel: "eleven_monolingual_v1",
  }),
);

const response = await agent.run({
  prompt: "Write a 60-second podcast intro about AI tooling trends in 2025, then generate the audio narration.",
});
console.log(response.content);
```

### Config

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `apiKey` | Yes | — | ElevenLabs API key |
| `defaultVoiceId` | No | — | Default voice used when none is specified |
| `defaultModel` | No | Provider default | Default TTS model |
| `timeoutMs` | No | `30000` | Per-request timeout |

### Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `text_to_speech` | `external` | Generate audio from text |
| `list_voices` | `external` | List available voices |
| `get_voice` | `external` | Get voice metadata by ID |
| `clone_voice` | `write` (requires confirmation) | Create a cloned voice |

---

## PublishingAdapter

Publish content to CMS platforms and content management systems.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { PublishingAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(PublishingAdapter.connect());

const response = await agent.run({
  prompt: "Draft a blog post about the new caching features in AgentCraft v1.4 and publish it as a draft.",
});
console.log(response.content);
```

### Tools

`PublishingAdapter` exposes tools for creating, updating, and managing content in connected CMS platforms. Write tools require confirmation before execution.

---

## Combining Specialized Adapters

Specialized adapters compose naturally. A content production pipeline might combine writing, image generation, and publishing in a single agent:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  ImageGenerationAdapter,
  ElevenLabsAdapter,
  EmailAdapter,
  PublishingAdapter,
} from "@deskcreate/agentcraft/adapters";

const contentAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(ImageGenerationAdapter.connect({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
  }))
  .use(ElevenLabsAdapter.connect({
    apiKey: process.env.ELEVENLABS_API_KEY!,
    defaultVoiceId: "21m00Tcm4TlvDq8ikWAM",
  }))
  .use(PublishingAdapter.connect())
  .use(EmailAdapter.connect({
    provider: "sendgrid",
    apiKey: process.env.SENDGRID_API_KEY!,
    from: "content@yourapp.com",
  }));

const response = await contentAgent.run({
  prompt: `
    Write a newsletter issue on the topic: "Why TypeScript developers should care about AI agents".
    Generate a header image.
    Produce an audio version for podcast listeners.
    Publish the text version to the CMS as a draft.
    Send a preview email to editor@yourapp.com for review.
  `,
});
```

## Related

- [Built-In Adapters](./built-in.md) — full adapter list including FetchAdapter, GitHubAdapter, and more
- [Adapter Safety](./safety.md) — constraining adapter behavior, approval gates, redaction
- [Custom Adapters](./custom.md) — building your own adapter
- [Tool Policy](../tools/tool-policy.md)
- [Adapter Config](../configuration/adapter-config.md)

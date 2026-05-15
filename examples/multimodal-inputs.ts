import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  VisionSkill,
  DocumentAnalysisSkill,
  TranscriptionSkill,
} from "@deskcreate/agentcraft/skills";

const visionAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(VisionSkill.create());

const imageResponse = await visionAgent.run({
  prompt: "Describe this screenshot for an accessibility review.",
  images: [
    {
      // type is required. Values: 'url' or 'base64'.
      // Use 'url' for externally reachable images and 'base64' for private bytes
      // that your app has already loaded.
      type: "url",
      data: "https://example.com/screenshot.png",
      // mediaType is optional for URLs and useful for base64 payloads.
      mediaType: "image/png",
    },
  ],
});

console.log(imageResponse.content);

const documentAgent = Agent.create({
  // File inputs require a model whose catalog entry supports files.
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(DocumentAnalysisSkill.create());

const documentResponse = await documentAgent.run({
  prompt: "Extract obligations, dates, and open questions from this document.",
  files: [
    {
      // filename and mediaType help the provider and downstream trace output
      // describe what was attached.
      filename: "contract.txt",
      mediaType: "text/plain",
      type: "base64",
      data: Buffer.from(
        "Renewal date: 2026-06-01. Notice period: 30 days.",
      ).toString("base64"),
    },
  ],
});

console.log(documentResponse.content);

const audioAgent = Agent.create({
  // Gemini models in the catalog advertise audio support. Use an audio-capable
  // model here instead of assuming every chat model can transcribe.
  model: Provider.gemini["gemini-2.5-flash"],
  apiKey: process.env.GOOGLE_API_KEY!,
}).use(TranscriptionSkill.create());

const transcript = await audioAgent.run({
  prompt: "Transcribe this short meeting clip and list action items.",
  audio: [
    {
      type: "url",
      data: "https://example.com/meeting-clip.mp3",
      mediaType: "audio/mp3",
    },
  ],
});

console.log(transcript.content);

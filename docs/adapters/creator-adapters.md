# Creator Adapters

Creator workflows add focused read-first adapters:

- `CitationManagerAdapter` stores source notes and claim provenance in the filesystem.
- `LinkCheckerAdapter` validates HTTPS links without mutating external systems.
- `SeoAdapter` defines provider-neutral SERP and keyword metric contracts.
- `CreatorResourcesAdapter` provides fixture-backed brand memory, content corpus, and asset-library reads.
- `PublishingAdapter` exposes confirmation-gated draft and publish tools.
- `AnalyticsAdapter` reads fixture or provider-backed content metrics.

SEO metric fields are represented as available or unavailable. AgentCraft must not invent volume, difficulty, CPC, or ranking data when a provider does not supply it.

Publishing tools are write-capable and require confirmation. Zero-config publishing packs prepare and QA assets; they do not publish silently.

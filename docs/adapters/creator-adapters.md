# Creator Adapters

The creator-specific adapters (`CitationManagerAdapter`, `LinkCheckerAdapter`, `SeoAdapter`, `CreatorResourcesAdapter`, `PublishingAdapter`, `AnalyticsAdapter`) were removed in **v0.3.0**.

Use the general-purpose primitives instead:

| Former adapter            | Current alternative                                                        |
| ------------------------- | -------------------------------------------------------------------------- |
| `CreatorResourcesAdapter` | [Skills](../skills/overview.md) with tone/brand reference files            |
| `SeoAdapter`              | [TavilySearchAdapter](./built-in.md#tavlysearchadapter) for real SERP data |
| `LinkCheckerAdapter`      | [FetchAdapter](./built-in.md#fetchadapter) for guarded URL reads           |
| `PublishingAdapter`       | Custom tool via [`tool()`](../tools/tool-authoring.md) with approval gate  |
| `CitationManagerAdapter`  | [ArtifactStore](../persistence/artifact-store.md) for typed storage        |
| `AnalyticsAdapter`        | [ArtifactStore](../persistence/artifact-store.md) + structured output      |

See [Built-In Adapters](./built-in.md) for the current adapter list.

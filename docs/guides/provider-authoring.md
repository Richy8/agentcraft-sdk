# Provider Authoring Guide

To add a provider:

1. Implement `ProviderProtocol`.
2. Add request formatting tests.
3. Add tool formatting and follow-up tests.
4. Add response and usage extraction tests.
5. Add streaming tests when supported.
6. Add error mapping tests.
7. Register the protocol.
8. Add model capabilities and source-stamped pricing metadata.

Provider implementations should avoid swallowing provider-specific metadata. Preserve useful metadata in `_raw` or `providerMetadata` when it can help debugging.

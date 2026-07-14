# Adapter preflight record

Checked: 13 July 2026

## Current state

The 14 requested model identities are documented in `models.json`. Devstral 2 has been corrected to its API ID `devstral-2512`, and Meta's public Model API documents Muse Spark 1.1 as `muse-spark-1.1`.

No provider credentials or authenticated model gateway are available in the present execution environment. The paid adapters therefore remain `unverified`; they must not be assigned a harness ID or scored until authenticated preflight confirms the exact returned model identity, streaming and multi-turn tools.

## NVIDIA free-route probe

Route tested: `opencode/nemotron-3-ultra-free`  
Requested underlying model: `nvidia/nemotron-3-ultra-550b-a55b`

Two isolated probes were attempted:

1. The model wrote the required two-line file and used the shell correctly, then the provider returned `Streaming response failed` before a final response.
2. The model first attempted an incorrect absolute path outside the worktree, the harness denied it, and the provider again returned `Streaming response failed` before recovery.

Conclusion: `preflight-partial-stream-error`. This is an adapter/transport result, not a scored model result. The free route is not eligible for Round 0 unless a later three-probe preflight completes without transport failure and the provider confirms the underlying immutable model ID. Prefer NVIDIA's authenticated NIM endpoint for the scored run.


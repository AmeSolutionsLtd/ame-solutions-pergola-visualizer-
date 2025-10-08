# AME Pergola Visualizer · V11 (Flux.1-dev)

This build uses **Replicate** + **Flux.1-dev** for ultra-realistic pergola visuals.
Works on **Netlify Functions** with a safe image upload flow (Replicate direct upload).

## Environment variables (Netlify → Project → Configuration → Environment variables)

- `REPLICATE_API_TOKEN` **(required)** — from https://replicate.com/account/api-tokens
- Model selector (choose ONE):
  - `REPLICATE_MODEL_VERSION` (exact version id), **or**
  - `REPLICATE_MODEL_ENDPOINT` (full endpoint, optional).

If neither is set, default endpoint is:
`https://api.replicate.com/v1/models/black-forest-labs/flux.1-dev/predictions`

After setting env vars, redeploy (Deploys → latest → *Redeploy this deploy*).

The function accepts base64 JSON instead of multipart to avoid “Missing content” issues.
Size guards included on client & server.

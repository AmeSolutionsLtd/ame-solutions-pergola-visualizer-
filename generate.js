import fetch from "node-fetch";

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODEL_VERSION = process.env.REPLICATE_MODEL_VERSION;
const MODEL_ENDPOINT = process.env.REPLICATE_MODEL_ENDPOINT;
const DEFAULT_MODEL_ENDPOINT = "https://api.replicate.com/v1/models/black-forest-labs/flux.1-dev/predictions";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!API_TOKEN) return json(500, { error: "Missing REPLICATE_API_TOKEN" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return json(400, { error: "Invalid JSON body" }); }

  const { imageBase64, filename = "upload.jpg", color = "", prompt = "" } = body || {};
  if (!imageBase64 || !imageBase64.startsWith("data:image/")) return json(400, { error: "Missing image data" });

  const base64 = imageBase64.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length > 9.5 * 1024 * 1024) return json(413, { error: "Image too large. Please upload a smaller image." });

  try {
    // 1) get upload url
    const upRes = await fetch("https://api.replicate.com/v1/uploads", {
      method: "POST",
      headers: { "Authorization": `Token ${API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filename })
    });
    const upJson = await upRes.json();
    if (!upRes.ok) return json(502, { error: `Failed to get upload URL: ${upJson?.detail || upRes.statusText}` });

    const uploadUrl = upJson.upload_url;
    const serveUrl = upJson.serve_url;

    // 2) put bytes
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream", "Content-Length": buffer.length.toString() },
      body: buffer
    });
    if (!putRes.ok) return json(502, { error: `Upload failed: ${putRes.status}` });

    // 3) start prediction
    const finalPrompt = buildPrompt(prompt, color);
    const input = { prompt: finalPrompt, image: serveUrl, guidance: 3.5 };

    let endpoint, payload;
    if (MODEL_VERSION) {
      endpoint = "https://api.replicate.com/v1/predictions";
      payload = { version: MODEL_VERSION, input };
    } else {
      endpoint = MODEL_ENDPOINT || DEFAULT_MODEL_ENDPOINT;
      payload = { input };
    }

    const predRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Authorization": `Token ${API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const pred = await predRes.json();
    if (!predRes.ok) return json(predRes.status, { error: pred?.detail || pred?.error || "Failed to start prediction" });

    let status = pred.status;
    let predictionUrl = pred.urls ? pred.urls.get : pred.self;
    let output = pred.output;
    const start = Date.now();

    while (!["succeeded","failed","canceled"].includes(status)) {
      await sleep(1500);
      const r = await fetch(predictionUrl, { headers: { "Authorization": `Token ${API_TOKEN}` } });
      const j = await r.json();
      status = j.status; output = j.output;
      if (Date.now()-start > 120000) return json(504, { error: "Generation timed out" });
    }

    if (status !== "succeeded") return json(502, { error: `Generation ${status}` });
    const imageUrl = Array.isArray(output) ? output[0] : output;
    return json(200, { image: imageUrl });
  } catch (e) {
    console.error(e);
    return json(500, { error: e.message || "Unexpected error" });
  }
};

function json(statusCode, obj){ return { statusCode, headers: { "Content-Type":"application/json" }, body: JSON.stringify(obj) }; }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function buildPrompt(userPrompt, color){
  const base = `Photorealistic, premium aluminium AME bioclimatic pergola installed on the scene.
Ultra-realistic materials, architectural accuracy, correct perspective, realistic sun shadows, 8K look.`;
  const colorTxt = color ? ` Colour: ${color}.` : "";
  const note = userPrompt ? ` ${userPrompt}` : "";
  return base + colorTxt + note;
}

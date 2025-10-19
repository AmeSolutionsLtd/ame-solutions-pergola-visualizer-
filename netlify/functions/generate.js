// netlify/functions/generate.js
// CommonJS style; relies on Netlify's global fetch (no node-fetch import)

exports.handler = async (event) => {
  const debug = !!process.env.DEBUG;

  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method Not Allowed" });
    }

    let payload = {};
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }

    const { image, prompt } = payload;

    if (!process.env.REPLICATE_API_TOKEN) {
      return json(500, { error: "Missing REPLICATE_API_TOKEN" });
    }

    if (!image) {
      return json(400, { error: "No image provided" });
    }

    // Use a stable model-path endpoint (no version hash required)
    // If you later want another model, change the path below.
    const modelEndpoint =
      process.env.REPLICATE_MODEL_ENDPOINT ||
      "https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions";

    // NOTE:
    // If your <image> is a data URL (data:image/jpeg;base64,....) Replicate usually needs a URL or uploaded file.
    // We'll transparently upload data URLs to Replicate Files and use the returned file id/URL.
    let imageForReplicate = image;

    if (/^data:image\/[a-zA-Z]+;base64,/.test(image)) {
      const fileUpload = await uploadDataUrlToReplicate(image, process.env.REPLICATE_API_TOKEN);
      if (!fileUpload.ok) {
        return json(400, { error: "Image upload failed", details: fileUpload.error });
      }
      // Replicate /v1/files returns { id, name, urls: { get, ... } }
      imageForReplicate = fileUpload.id || fileUpload.urls?.get || fileUpload.url;
    }

    // Build prediction input (adjust prompts later as you like)
    const predictionBody = {
      input: {
        image: imageForReplicate,
        prompt:
          prompt ||
          "modern aluminum bioclimatic pergola, realistic daylight render, premium architecture",
      },
    };

    const resp = await fetch(modelEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify(predictionBody),
    });

    const data = await resp.json();

    if (!resp.ok) {
      // Expose real error if DEBUG=1, otherwise generic
      return json(resp.status || 500, {
        error: "Replicate request failed",
        ...(debug ? { details: data } : {}),
      });
    }

    return json(200, { ok: true, data });
  } catch (err) {
    return json(500, {
      error: "Server error",
      ...(debug ? { details: err?.message || err } : {}),
    });
  }
};

// ---------- helpers ----------
function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function uploadDataUrlToReplicate(dataUrl, token) {
  try {
    // Turn data URL into a Blob
    const r = await fetch(dataUrl);
    const blob = await r.blob();

    // Build multipart/form-data
    const form = new FormData();
    form.append("file", blob, "upload.jpg");

    const up = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        // DO NOT set Content-Type; fetch will set proper multipart boundaries
      },
      body: form,
    });

    const j = await up.json();
    if (!up.ok) return { ok: false, error: j };
    return { ok: true, ...j };
  } catch (e) {
    return { ok: false, error: e?.message || e };
  }
}

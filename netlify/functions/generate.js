import fetch from "node-fetch";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const { image, prompt } = JSON.parse(event.body || "{}");

    if (!image) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "No image provided" }),
      };
    }

    // 🧠 Call Replicate API
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: process.env.REPLICATE_MODEL_VERSION || "black-forest-labs/flux-1.1-pro",
        input: {
          image: image,
          prompt: prompt || "modern aluminum bioclimatic pergola, luxury house, realistic daylight render",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data) {
      throw new Error(data.error || "Failed to generate image");
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: data }),
    };
  } catch (err) {
    console.error("Server error:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Server error" }),
    };
  }
};

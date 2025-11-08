import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use("/api/*", cors());

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// AI Chat endpoint using Cloudflare Workers AI
app.post("/api/chat", async (c) => {
  try {
    const { question, context } = await c.req.json();

    if (!question) {
      return c.json({ error: "Question is required" }, 400);
    }

    // Use Cloudflare Workers AI
    const ai = c.env.AI;

    // Build context-aware prompt
    const systemPrompt = `You are an expert sim racing telemetry analyst. You help drivers analyze their Assetto Corsa telemetry data to improve lap times. Be specific, concise, and actionable in your advice. Focus on speed differences, braking points, throttle application, and racing lines.`;

    const userPrompt = context
      ? `Context: ${JSON.stringify(context)}\n\nQuestion: ${question}`
      : question;

    // Use a fast, efficient model for chat
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 512,
      temperature: 0.7
    });

    return c.json({
      response: response.response || "I'm analyzing your telemetry data...",
      model: "@cf/meta/llama-3.1-8b-instruct"
    });

  } catch (error) {
    console.error("AI chat error:", error);
    return c.json({
      error: "Failed to process chat request",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Telemetry analysis endpoint - get suggestions based on session data
app.post("/api/analyze-session", async (c) => {
  try {
    const { sessionId, circuitName, userName, lapTime, compareToTime } = await c.req.json();

    const ai = c.env.AI;

    const prompt = `Analyze this sim racing lap:
- Circuit: ${circuitName}
- Driver: ${userName}
- Lap time: ${lapTime}s
${compareToTime ? `- Comparing to: ${compareToTime}s (delta: ${(lapTime - compareToTime).toFixed(3)}s)` : ''}

Provide 3-5 specific, actionable tips to improve lap time. Focus on common areas where time is lost.`;

    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a professional sim racing coach analyzing telemetry." },
        { role: "user", content: prompt }
      ],
      max_tokens: 384,
      temperature: 0.6
    });

    return c.json({
      tips: response.response,
      sessionId
    });

  } catch (error) {
    console.error("Session analysis error:", error);
    return c.json({
      error: "Failed to analyze session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

export default app;

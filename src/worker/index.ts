import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use("/api/*", cors());

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// Helper function to call Claude API as fallback
async function callClaudeAPI(systemPrompt: string, userPrompt: string, claudeApiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.content[0].text;
}

// AI Chat endpoint with DeepSeek R1 primary and Claude fallback
app.post("/api/chat", async (c) => {
  try {
    const { question, context } = await c.req.json();

    if (!question) {
      return c.json({ error: "Question is required" }, 400);
    }

    // Build context-aware prompt
    const systemPrompt = `You are an expert sim racing telemetry analyst. You help drivers analyze their Assetto Corsa telemetry data to improve lap times. Be specific, concise, and actionable in your advice. Focus on speed differences, braking points, throttle application, and racing lines.`;

    const userPrompt = context
      ? `Context: ${JSON.stringify(context)}\n\nQuestion: ${question}`
      : question;

    let responseText: string;
    let modelUsed: string;

    try {
      // Try Cloudflare Workers AI with DeepSeek R1 first
      const ai = c.env.AI;
      const aiResponse = await ai.run("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1024,
        temperature: 0.7
      });

      responseText = aiResponse.response || "";
      modelUsed = "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b";

      // If Workers AI returns empty response, fall back to Claude
      if (!responseText || responseText.trim().length === 0) {
        throw new Error("Empty response from Workers AI");
      }

    } catch (workerAiError) {
      console.error("Workers AI failed, falling back to Claude:", workerAiError);

      // Fallback to Claude API
      const claudeApiKey = c.env.CLAUDE_API_KEY;
      responseText = await callClaudeAPI(systemPrompt, userPrompt, claudeApiKey);
      modelUsed = "claude-sonnet-4-20250514 (fallback)";
    }

    return c.json({
      response: responseText,
      model: modelUsed
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

    const systemPrompt = "You are a professional sim racing coach analyzing telemetry.";
    const userPrompt = `Analyze this sim racing lap:
- Circuit: ${circuitName}
- Driver: ${userName}
- Lap time: ${lapTime}s
${compareToTime ? `- Comparing to: ${compareToTime}s (delta: ${(lapTime - compareToTime).toFixed(3)}s)` : ''}

Provide 3-5 specific, actionable tips to improve lap time. Focus on common areas where time is lost.`;

    let responseText: string;
    let modelUsed: string;

    try {
      // Try Cloudflare Workers AI with DeepSeek R1 first
      const ai = c.env.AI;
      const aiResponse = await ai.run("@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 768,
        temperature: 0.6
      });

      responseText = aiResponse.response || "";
      modelUsed = "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b";

      if (!responseText || responseText.trim().length === 0) {
        throw new Error("Empty response from Workers AI");
      }

    } catch (workerAiError) {
      console.error("Workers AI failed, falling back to Claude:", workerAiError);

      // Fallback to Claude API
      const claudeApiKey = c.env.CLAUDE_API_KEY;
      responseText = await callClaudeAPI(systemPrompt, userPrompt, claudeApiKey);
      modelUsed = "claude-sonnet-4-20250514 (fallback)";
    }

    return c.json({
      tips: responseText,
      sessionId,
      model: modelUsed
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

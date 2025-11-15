import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from '@supabase/supabase-js';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for API routes
app.use("/api/*", cors());

app.get("/api/", (c) => c.json({ name: "Cloudflare" }));

// Helper to get Supabase client
function getSupabase(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

// ========== USER ROUTES ==========
app.get("/api/users", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch users' }, 500);
  }
});

app.post("/api/users", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { name, display_name } = await c.req.json();
    const { data, error } = await supabase
      .from('users')
      .insert({ name, display_name })
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to add user' }, 500);
  }
});

// ========== CIRCUIT ROUTES ==========
app.get("/api/circuits", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase.from('circuits').select('*');
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch circuits' }, 500);
  }
});

app.post("/api/circuits", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('circuits')
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to add circuit' }, 500);
  }
});

// ========== CAR ROUTES ==========
app.get("/api/cars", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('display_name', { ascending: true });
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch cars' }, 500);
  }
});

app.post("/api/cars", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { name, display_name, category } = await c.req.json();
    const { data, error } = await supabase
      .from('cars')
      .insert({ name, display_name, category })
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to add car' }, 500);
  }
});

// ========== TELEMETRY SESSION ROUTES ==========
app.post("/api/telemetry-sessions", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { user_id, circuit_id, car_id, lap_time, file_name, file_type, r2_path } = await c.req.json();

    // Check for existing versions of this file
    const { data: existing, error: queryError } = await supabase
      .from('telemetry_sessions')
      .select('version')
      .eq('user_id', user_id)
      .eq('circuit_id', circuit_id)
      .eq('car_id', car_id)
      .eq('file_name', file_name)
      .order('version', { ascending: false })
      .limit(1);

    if (queryError) throw queryError;

    // Calculate next version number
    const version = existing && existing.length > 0 ? existing[0].version + 1 : 1;

    // Insert with calculated version
    const { data, error } = await supabase
      .from('telemetry_sessions')
      .insert({ user_id, circuit_id, car_id, lap_time, file_name, file_type, r2_path, version })
      .select()
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to create session' }, 500);
  }
});

app.get("/api/telemetry-sessions", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const userId = c.req.query('user_id');
    const circuitId = c.req.query('circuit_id');
    const carId = c.req.query('car_id');

    let query = supabase
      .from('telemetry_sessions')
      .select(`
        *,
        users (display_name),
        circuits (display_name),
        cars (display_name)
      `)
      .order('uploaded_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (circuitId) query = query.eq('circuit_id', circuitId);
    if (carId) query = query.eq('car_id', carId);

    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch sessions' }, 500);
  }
});

app.get("/api/telemetry-sessions/:id", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('telemetry_sessions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch session' }, 500);
  }
});

app.delete("/api/telemetry-sessions/:id", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const id = c.req.param('id');

    // First, get the session to check if it has an R2 file
    const { data: session, error: fetchError } = await supabase
      .from('telemetry_sessions')
      .select('r2_path')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Delete all telemetry data points for this session
    const { error: dataError } = await supabase
      .from('telemetry_data')
      .delete()
      .eq('session_id', id);

    if (dataError) throw dataError;

    // Delete corner analysis if it exists
    await supabase
      .from('corner_analysis')
      .delete()
      .eq('session_id', id);

    // Delete the session itself
    const { error: sessionError } = await supabase
      .from('telemetry_sessions')
      .delete()
      .eq('id', id);

    if (sessionError) throw sessionError;

    // Delete from R2 if file exists
    if (session?.r2_path) {
      try {
        const bucket = c.env.TELEMETRY_FILES;
        await bucket.delete(session.r2_path);
      } catch (r2Error) {
        console.error('Failed to delete R2 file:', r2Error);
        // Continue even if R2 deletion fails
      }
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to delete session' }, 500);
  }
});

// ========== TELEMETRY DATA ROUTES ==========
app.post("/api/telemetry-data", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const { session_id, telemetry_points } = await c.req.json();

    const records = telemetry_points.map((point: any, index: number) => ({
      session_id,
      distance: point.distance,
      speed: point.speed,
      throttle: point.throttle,
      brake: point.brake,
      gear: point.gear,
      rpm: point.rpm,
      lateral_g: point.lateralG || point.lateral_g || 0,
      longitudinal_g: point.longitudinalG || point.longitudinal_g || 0,
      time: point.time || 0,
      cumulative_time: point.cumulative_time || point.cumulativeTime || 0,
      scaled_distance: point.scaled_distance || point.scaledDistance || 0,
      smoothed_gear: point.smoothed_gear || point.smoothedGear || point.gear || 0,
      smoothed_throttle: point.smoothed_throttle || point.smoothedThrottle || point.throttle || 0,
      data_index: index
    }));

    // Insert in batches of 1000 to avoid payload limits
    const batchSize = 1000;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('telemetry_data')
        .insert(batch);

      if (error) throw error;
      totalInserted += batch.length;
    }

    return c.json({ success: true, inserted: totalInserted });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to upload telemetry data' }, 500);
  }
});

app.get("/api/telemetry-data/:sessionId", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const sessionId = c.req.param('sessionId');

    // Fetch all telemetry data (TC files have ~4000 points, CSV can vary)
    // Supabase has a default limit, so we need to paginate or set a high limit
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('telemetry_data')
        .select('*')
        .eq('session_id', sessionId)
        .order('distance', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    return c.json(allData);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch telemetry data' }, 500);
  }
});

// ========== CORNER ANALYSIS ROUTES ==========
app.post("/api/corner-analysis", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const body = await c.req.json();
    const { data, error } = await supabase
      .from('corner_analysis')
      .insert(body);
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to save corner analysis' }, 500);
  }
});

app.get("/api/corner-analysis", async (c) => {
  try {
    const supabase = getSupabase(c.env);
    const sessionId = c.req.query('session_id');
    const userId = c.req.query('user_id');
    const circuitId = c.req.query('circuit_id');
    const carId = c.req.query('car_id');

    let query = supabase.from('corner_analysis').select('*');

    if (sessionId) query = query.eq('session_id', sessionId);
    if (userId) query = query.eq('user_id', userId);
    if (circuitId) query = query.eq('circuit_id', circuitId);
    if (carId) query = query.eq('car_id', carId);

    const { data, error } = await query;
    if (error) throw error;
    return c.json(data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed to fetch corner analysis' }, 500);
  }
});

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

// AI Chat endpoint for MCP-based telemetry analysis
app.post("/api/chat", async (c) => {
  try {
    const { question, context } = await c.req.json();

    if (!question) {
      return c.json({ error: "Question is required" }, 400);
    }

    // Build context-aware prompt for MCP telemetry analysis
    const systemPrompt = `You are a quantitative telemetry analyst for racing simulation data. Your role is to analyze telemetry data from the telemetry_data table using MCP (Model Context Protocol) to provide data-driven insights.

Key responsibilities:
- Query telemetry_data table via MCP to retrieve actual session data
- Perform quantitative analysis on speed, throttle, brake, and gear data
- Calculate statistics like average speed, braking zones, throttle application patterns
- Identify specific distance markers where improvements can be made
- Compare data points across different sessions when applicable
- Provide concrete, measurable insights based on the actual data

Always ground your responses in actual telemetry numbers. When asked questions, use MCP to query the database, analyze the returned data, and provide specific quantitative findings.`;

    const userPrompt = context
      ? `Context: ${JSON.stringify(context)}\n\nQuestion: ${question}`
      : question;

    let responseText: string;
    let modelUsed: string;

    try {
      // Use Cloudflare Workers AI with Llama 4 Scout
      const ai = c.env.AI;
      const aiResponse = await ai.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1024,
        temperature: 0.5
      });

      responseText = aiResponse.response || "";
      modelUsed = "@cf/meta/llama-4-scout-17b-16e-instruct";

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

// File upload endpoint - stores raw telemetry files to R2
app.post("/api/upload-file", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const trackName = formData.get('trackName') as string;
    const sessionId = formData.get('sessionId') as string;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    if (!userId || !trackName || !sessionId) {
      return c.json({ error: "Missing required metadata (userId, trackName, sessionId)" }, 400);
    }

    // Generate R2 path: users/{userId}/{trackName}/{sessionId}/{filename}
    const r2Path = `users/${userId}/${trackName}/${sessionId}/${file.name}`;

    // Upload to R2
    const bucket = c.env.TELEMETRY_FILES;
    await bucket.put(r2Path, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        userId,
        trackName,
        sessionId,
      },
    });

    return c.json({
      success: true,
      r2Path,
      fileSize: file.size,
      fileName: file.name,
    });

  } catch (error) {
    console.error("File upload error:", error);
    return c.json({
      error: "Failed to upload file",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

// Get file from R2
app.get("/api/get-file/:userId/:trackName/:sessionId/:filename", async (c) => {
  try {
    const { userId, trackName, sessionId, filename } = c.req.param();
    const r2Path = `users/${userId}/${trackName}/${sessionId}/${filename}`;

    const bucket = c.env.TELEMETRY_FILES;
    const object = await bucket.get(r2Path);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("File retrieval error:", error);
    return c.json({
      error: "Failed to retrieve file",
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
      // Use Cloudflare Workers AI with Llama 4 Scout
      const ai = c.env.AI;
      const aiResponse = await ai.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 768,
        temperature: 0.6
      });

      responseText = aiResponse.response || "";
      modelUsed = "@cf/meta/llama-4-scout-17b-16e-instruct";

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

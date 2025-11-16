# Telemetry App Architecture

## Technology Stack Overview

### Data Storage: Supabase (PostgreSQL) vs Cloudflare KV

**Decision: Using Supabase for ALL data storage**

#### Why Supabase Instead of KV?

The original build instructions suggested using Cloudflare KV for circuit metadata, but I chose Supabase for everything because:

1. **Relational Data Model**
   - Our data has complex relationships: Users → Sessions → Telemetry Data → Cars → Circuits
   - Need JOIN queries across multiple tables (e.g., sessions with user, car, and circuit data)
   - KV is a simple key-value store, not ideal for relational queries

2. **Data Querying Requirements**
   - Filter sessions by circuit AND car (requires compound indexes)
   - Aggregate corner analysis across multiple sessions
   - Compare data between users, circuits, and cars
   - All of this is trivial in SQL, complex in KV

3. **Data Consistency**
   - PostgreSQL provides ACID transactions
   - Referential integrity with foreign keys
   - Ensures data consistency across related tables

4. **Scalability for This Use Case**
   - Telemetry sessions can have 1000s of data points
   - Corner analysis requires complex calculations
   - Supabase handles this better than KV lookups

5. **Developer Experience**
   - Supabase provides auto-generated APIs
   - Built-in authentication (if needed later)
   - Real-time subscriptions (for live telemetry)
   - Better tooling and debugging

#### When Would We Use KV?

Cloudflare KV would be ideal for:
- Simple configuration data that rarely changes
- Read-heavy caching layer (e.g., processed telemetry summaries)
- Session tokens or temporary data
- Static content that needs global edge distribution

**If you want to add KV**, we could use it for:
```javascript
// Cache processed corner analysis results
KV.put(`corner_analysis:${userId}:${circuitId}:${carId}`, JSON.stringify(stats), {
  expirationTtl: 3600 // 1 hour cache
});
```

---

## AI Integration: Cloudflare Workers AI

### Why Cloudflare Workers AI?

1. **Cost Effective**
   - Included in Cloudflare Workers paid plan ($5/month)
   - No per-request API costs (unlike OpenAI/Anthropic)
   - Scales automatically with your Workers

2. **Low Latency**
   - Runs on Cloudflare's edge network
   - No external API calls to third-party services
   - Fast response times for real-time chat

3. **Privacy**
   - Data doesn't leave Cloudflare's network
   - No third-party API logging
   - Good for sensitive telemetry data

4. **Model Choice**
   - Using `@cf/meta/llama-3.1-8b-instruct`
   - Fast inference (~500ms response time)
   - Good balance of quality and speed for coaching advice

### API Endpoints

#### `POST /api/chat`
Real-time AI chat for telemetry questions
- Input: User question + conversation context
- Output: AI-generated advice on racing techniques
- Use case: General coaching, technique questions

#### `POST /api/analyze-session`
Session-specific analysis
- Input: Session data (lap time, circuit, driver)
- Output: 3-5 actionable tips for improvement
- Use case: Post-session review, comparing laps

### Extending AI Features

**Future possibilities:**
1. **Data-driven analysis**: Query Supabase from worker, feed actual telemetry to AI
2. **Automated insights**: Analyze uploaded sessions automatically
3. **Comparative analysis**: "Why is their lap faster than mine?"
4. **Setup recommendations**: "Best car setup for Monza in wet conditions"

---

## Database Schema

### Core Tables

**users** - Driver profiles
- Sam and Friend (expandable)

**cars** - Vehicle database
- User-addable (Ferrari, Porsche, BMW, Mercedes, etc.)
- Manufacturer and category tracking

**circuits** - Track configurations
- Corner classifications (slow/medium/fast thresholds)
- Country metadata

**telemetry_sessions** - Individual lap sessions
- Links: user + circuit + car
- Lap time, file name, metadata

**telemetry_data** - Actual data points
- Distance, speed, throttle, brake, G-forces
- Indexed by session and data_index for fast queries

**corner_analysis** - Pre-computed statistics
- Per session, per corner type (slow/medium/fast)
- Entry/exit/apex speeds, brake pressure
- Enables fast dashboard queries

### Key Relationships

```
users ←─────── telemetry_sessions ←─────── telemetry_data
circuits ←──/                      \
cars ←──/                            └────── corner_analysis
```

### Why Pre-compute Corner Analysis?

Instead of calculating corner stats on every query:
1. Upload CSV → Process once → Store results
2. Dashboard loads instantly (just query pre-computed data)
3. Trade storage for speed (acceptable for this use case)

---

## Data Flow

### 1. Upload Telemetry
```
User selects: User + Circuit + Car
↓
Upload CSV
↓
Parse & validate CSV
↓
Calculate lap time
↓
Create telemetry_session (with car_id)
↓
Insert telemetry_data (1000s of points)
↓
Analyze corners (classify by speed thresholds)
↓
Store corner_analysis (pre-computed stats)
```

### 2. Compare Laps
```
User selects: Circuit + Car
↓
Query sessions WHERE circuit_id = X AND car_id = Y
↓
User selects 2 sessions
↓
Fetch telemetry_data for both sessions
↓
Render Plotly charts with delta overlay
```

### 3. AI Coaching
```
User asks question
↓
Send to /api/chat with context
↓
Cloudflare Workers AI processes
↓
Llama 3.1 generates response
↓
Display to user
```

---

## Performance Considerations

### Database Indexes
```sql
-- Fast session lookups by circuit + car
idx_telemetry_sessions_user_circuit_car

-- Fast telemetry data retrieval
idx_telemetry_data_session

-- Fast corner analysis queries
idx_corner_analysis_lookup (user_id, circuit_id, car_id, corner_type)
```

### Batching
- Telemetry data uploads in batches of 1000 points
- Prevents timeout on large CSV files

### Caching Opportunities (Future)
- Cache corner analysis in KV (optional)
- Cache frequently accessed sessions
- Cache AI responses for common questions

---

## Cloudflare Workers Configuration

### Current Bindings
```json
{
  "ai": {
    "binding": "AI"  // Cloudflare Workers AI
  }
}
```

### Optional Future Bindings
```json
{
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "your-kv-id"
    }
  ],
  "d1_databases": [
    {
      "binding": "TELEMETRY_ARCHIVE",  // For long-term storage
      "database_id": "your-d1-id"
    }
  ]
}
```

---

## Why This Architecture Works

### For This Project
✅ Small to medium dataset (2 users, multiple cars/circuits)
✅ Complex queries across relationships
✅ Real-time AI coaching without external costs
✅ Easy to extend (add users, cars, circuits)
✅ Fast dashboard performance (pre-computed stats)

### Scalability Path
If you grow to hundreds of users:
1. Add caching layer with KV
2. Move historical data to D1 (cheaper storage)
3. Keep recent sessions in Supabase
4. Add pagination to dashboards

---

## Cost Breakdown

### Current Stack Costs
- **Supabase**: Free tier (500MB database, enough for thousands of sessions)
- **Cloudflare Workers**: $5/month (includes AI)
- **Cloudflare Pages**: Free (hosting)

### Total: $5/month (or free if using Workers free tier for testing)

---

## Decisions Made

✅ **Supabase over KV** - Better for relational data
✅ **Cloudflare Workers AI** - Cost-effective, fast, private
✅ **Llama 3.1 8B** - Good balance of speed and quality
✅ **Pre-computed corner analysis** - Faster dashboards
✅ **User-addable cars** - Flexibility for any vehicle
✅ **Per-circuit corner thresholds** - Realistic classifications

---

## What You Get

- 📊 Full telemetry comparison (2 laps, any metric)
- 🏎️ Car tracking (compare same car on same circuit)
- 📈 Corner analysis (slow/medium/fast performance)
- 🤖 AI coaching (real-time advice, no API costs)
- 🎨 F1-style dark theme
- 🔐 Password protection
- ⚡ Fast queries with proper indexing

Ready for production! 🏁

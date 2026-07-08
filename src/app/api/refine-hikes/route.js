import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { trails, userMessage, history, preferences, locationName } = await request.json();

    const trailSummary = (trails || [])
      .map((t, i) =>
        `${i + 1}. ${t.name} — ${t.difficulty || 'unknown difficulty'}, ${t.length || 'unknown length'}, ` +
        `${t.elevationGain || 'unknown elevation'}, features: ${t.features?.join(', ') || 'none'}, ${t.distance}`
      )
      .join('\n');

    const system = `You are a conversational hiking guide. The user has seen trail recommendations and wants to refine them.

Current trails shown to user:
${trailSummary}

Your job:
1. If user wants to filter/reorder → return a filtered/reordered subset with all original fields intact
2. If user needs completely different trails (closer, different area, different type) → set action to "new_search"
3. If user is asking a question (not refining) → answer it, keep trails unchanged, set action to "answered"

Return JSON exactly like this:
{
  "trails": [...],   // AI trail objects with ALL original fields (especially lat/lng/why/tip/bestTime/parkingNote)
  "message": "...", // 1–2 sentence friendly response explaining what you did
  "action": "filtered" | "new_search" | "answered"
}

For "new_search": set trails to [] and explain in message what you'll search for.
For "filtered": always include ALL original fields from the existing trails — copy them verbatim.
RESPOND WITH VALID JSON ONLY.`;

    const messages = [
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ];

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system,
      messages,
    });

    const raw = response.content[0].text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      // Graceful fallback: treat as a conversational answer
      result = { trails, message: response.content[0].text.trim(), action: 'answered' };
    }

    // Re-merge original trail data so lat/lng/photos are preserved even when Claude only returns name
    if (result.action === 'filtered' && result.trails?.length) {
      result.trails = result.trails.map((rt) => {
        const orig = (trails || []).find((t) => t.name === rt.name);
        return orig ? { ...orig, ...rt } : rt;
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Refine error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

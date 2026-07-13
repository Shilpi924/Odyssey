import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { trails, userMessage, history } = await request.json();
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Conversational refinement is not configured' }, { status: 503 });
    if (!Array.isArray(trails) || !userMessage?.trim()) return NextResponse.json({ error: 'Trails and userMessage are required' }, { status: 400 });
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
1. If user wants to filter/reorder → return only the exact names of a filtered/reordered subset. Never add a trail or alter its facts.
2. If user needs completely different trails (closer, different area, different type) → set action to "new_search"
3. If user is asking a question (not refining) → answer it, keep trails unchanged, set action to "answered"

Return JSON exactly like this:
{
  "trails": [{ "name": "exact existing trail name" }],
  "message": "...", // 1–2 sentence friendly response explaining what you did
  "action": "filtered" | "new_search" | "answered"
}

For "new_search": set trails to [] and explain in message what you'll search for.
For "filtered": include names from the supplied list only.
RESPOND WITH VALID JSON ONLY.

-------------------
SAFETY MANDATE:
When a user states that they are lost, injured, stranded, disoriented, or unable to return:
- Keep the response short, calm, and easy to follow.
- Do not invent trails, landmarks, coordinates, distances, compass directions, or rescue information.
- Instruct them to remain calm, stop moving, and utilize the on-screen deterministic Safety Controls.
- Suggest checking the locally recorded route and sharing coordinates with emergency contacts.`;

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

    // Only the original server-supplied objects may be returned. Model output can
    // choose and order known names but cannot change a sourced fact.
    if (result.action === 'filtered' && result.trails?.length) {
      result.trails = result.trails
        .map(candidate => trails.find(trail => trail.name === candidate.name))
        .filter(Boolean);
    } else if (result.action !== 'new_search') {
      result.trails = trails;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Refine error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

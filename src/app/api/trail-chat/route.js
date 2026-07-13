import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { trail, question, history } = await request.json();
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'Trail Guide is not configured' }, { status: 503 });
    if (!trail?.name || !question?.trim()) return NextResponse.json({ error: 'Trail and question are required' }, { status: 400 });
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const system = `You are a cautious hiking information assistant. Answer only from the supplied trail record and clearly label general advice. Never claim personal experience or current local knowledge.

Supplied trail record for "${trail.name}":
- Length: ${trail.length || 'not supplied'}
- Difficulty: ${trail.difficulty || 'unknown'}
- Elevation gain: ${trail.elevationGain || 'unknown'}
- Features: ${trail.features?.join(', ') || 'general trail'}
- Your tip: "${trail.tip || 'No specific tip'}"
- Best time: "${trail.bestTime || 'not supplied'}"
- Parking: "${trail.parkingNote || 'Check locally'}"

Be conversational, specific, and practical. Keep answers to 2–4 sentences unless the question clearly needs more. Do not invent facts that are absent from the record.

If asked about real-time things you can't know (current conditions, trail closures, live crowd data), be upfront about it, offer cautious general guidance, and tell the user to verify an official source.

-------------------
SAFETY MANDATE:
When a user states that they are lost, injured, stranded, disoriented, or unable to return:
- Keep the response short, calm, and easy to follow.
- Do not invent trails, landmarks, coordinates, distances, compass directions, or rescue information.
- Instruct them to remain calm, stop moving, and utilize the on-screen deterministic Safety Controls.
- Suggest checking the locally recorded route and sharing coordinates with emergency contacts.`;

    const messages = [
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ];

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 450,
      system,
      messages,
    });

    return NextResponse.json({ answer: response.content[0].text.trim() });
  } catch (error) {
    console.error('Trail chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { trail, question, history } = await request.json();

    const system = `You are a friendly, knowledgeable local hiking guide who has personally hiked "${trail.name}" many times across all seasons.

What you know about this trail:
- Length: ${trail.length || 'varies'}
- Difficulty: ${trail.difficulty || 'unknown'}
- Elevation gain: ${trail.elevationGain || 'unknown'}
- Features: ${trail.features?.join(', ') || 'general trail'}
- Your tip: "${trail.tip || 'No specific tip'}"
- Best time: "${trail.bestTime || 'Anytime'}"
- Parking: "${trail.parkingNote || 'Check locally'}"

Speak as someone who genuinely loves this trail and wants the user to have a great experience. Be conversational, specific, and practical. Keep answers to 2–4 sentences unless the question clearly needs more.

If asked about real-time things you can't know (current conditions, trail closures, live crowd data), be upfront about it but give your best general advice from experience.

-------------------
SAFETY MANDATE:
When a user states that they are lost, injured, stranded, disoriented, or unable to return:
- Keep the response short, calm, and easy to follow.
- Do not invent trails, landmarks, coordinates, distances, compass directions, or rescue information.
- Instruct them to remain calm, stop moving, and utilize the on-screen deterministic Safety Controls.
- Suggest checking the offline map, recorded route, and sharing coordinates with emergency contacts.`;

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

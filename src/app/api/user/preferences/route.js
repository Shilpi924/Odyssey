import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { db } from '../../../../lib/pg';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await db.query('SELECT preferences FROM user_preferences WHERE user_id = $1', [session.user.id]);
    if (res.rows.length > 0) {
      return NextResponse.json({ preferences: res.rows[0].preferences });
    } else {
      return NextResponse.json({ preferences: {} });
    }
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preferences } = await request.json();
    if (!preferences) {
      return NextResponse.json({ error: 'Preferences required' }, { status: 400 });
    }

    await db.query(
      `INSERT INTO user_preferences (user_id, preferences, updated_at) 
       VALUES ($1, $2, NOW()) 
       ON CONFLICT (user_id) 
       DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()`,
      [session.user.id, JSON.stringify(preferences)]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '../../../lib/pg';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    // Basic security to prevent random people from migrating the db
    if (authHeader !== `Bearer ${process.env.NEXTAUTH_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sqlPath = path.join(process.cwd(), 'postgres_setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.query(sql);

    return NextResponse.json({ success: true, message: 'Database migrated successfully!' });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 });
  }
}

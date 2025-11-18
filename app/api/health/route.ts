import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    // Simple health check - verify DB is accessible
    const db = getDb();
    const result = db.prepare('SELECT 1 as health').get();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'error'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      },
      { status: 500 }
    );
  }
}

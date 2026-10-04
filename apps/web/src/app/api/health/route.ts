import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness probe for container health checks (GET /api/health). */
export function GET() {
  return NextResponse.json({ status: 'ok' });
}

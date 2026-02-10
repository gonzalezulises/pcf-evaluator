import { handlers } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitByIp } from '@/lib/rate-limit';

export const { GET } = handlers;

// Wrap POST to add rate limiting on sign-in attempts
export async function POST(request: NextRequest) {
  // Only rate-limit sign-in (credentials), not other auth actions
  const url = new URL(request.url);
  if (url.pathname.includes('callback/credentials') || url.pathname.includes('signin')) {
    const rl = rateLimitByIp(request, 'login', { limit: 10, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto.' },
        { status: 429 }
      );
    }
  }

  return handlers.POST(request);
}

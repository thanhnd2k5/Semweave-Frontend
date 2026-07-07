import { NextRequest, NextResponse } from 'next/server';
import { isProxyPathAllowed } from '@/common/constants/proxy';
import { getEnvConfig } from '@/config/env';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

export async function handleApiProxy(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const env = getEnvConfig();

  if (!env.FEATURE_API_PROXY || !env.API_PROXY_TARGET) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'API proxy disabled' } },
      { status: 404 },
    );
  }

  if (env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'API proxy is disabled in production — use a reverse proxy instead',
        },
      },
      { status: 403 },
    );
  }

  const targetPath = pathSegments.join('/');

  if (!isProxyPathAllowed(targetPath)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Path not allowed by proxy' } },
      { status: 403 },
    );
  }

  const url = new URL(targetPath, env.API_PROXY_TARGET);
  url.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const response = await fetch(url.toString(), {
    method: request.method,
    headers,
    body,
    credentials: 'include',
  });

  const responseHeaders = rewriteProxyResponseHeaders(response.headers);

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

function rewriteProxyResponseHeaders(headers: Headers): Headers {
  const rewritten = new Headers();

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      rewritten.set(key, value);
    }
  });

  for (const cookie of headers.getSetCookie()) {
    rewritten.append('set-cookie', rewriteSetCookiePath(cookie));
  }

  return rewritten;
}

/** Rewrite backend cookie paths so browsers send them on /api/* requests. */
export function rewriteSetCookiePath(cookie: string): string {
  return cookie
    .replace(/Path=\/auth\//gi, 'Path=/api/auth/')
    .replace(/Path=\/auth"/gi, 'Path=/api/auth"')
    .replace(/Path=\/auth;/gi, 'Path=/api/auth;');
}

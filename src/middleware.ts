import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const AUTH_PAGES = ['/signin', '/signup'];
const PUBLIC_PATHS = ['/signin', '/signup', '/api/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((path) => pathname === path);
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Authenticated user on sign-in/sign-up page → redirect to home
  if (isAuthPage(pathname) && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Unauthenticated user on protected route → redirect to sign-in
  // Preserve original URL as callbackUrl so user returns after auth
  if (!isPublicPath(pathname) && !token) {
    const signInUrl = new URL('/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

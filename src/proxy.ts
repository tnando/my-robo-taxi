import { auth } from '@/auth';

const AUTH_PAGES = ['/signin', '/signup'];
const PUBLIC_PATHS = ['/signin', '/signup', '/api/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((path) => pathname === path);
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  // Authenticated user on sign-in/sign-up page → redirect to home
  if (isAuthPage(pathname) && req.auth) {
    return Response.redirect(new URL('/', req.url));
  }

  // Unauthenticated user on protected route → redirect to sign-in
  // Preserve original URL as callbackUrl so user returns after auth
  if (!isPublicPath(pathname) && !req.auth) {
    const signInUrl = new URL('/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return Response.redirect(signInUrl);
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

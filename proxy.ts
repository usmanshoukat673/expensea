import { type NextRequest, NextResponse } from 'next/server';
import { resolveWorkspace } from '@/lib/auth/workspace';
import { updateSession } from '@/lib/supabase/middleware';

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];
const ONBOARDING_ROUTES = ['/onboarding', '/create-team', '/join-team'];
const SESSION_COOKIE_RE = /sb-.+-auth-token/;

function matches(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

function redirectWithSession(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, supabase, supabaseResponse } = await updateSession(request);
  const hadSessionCookie = request.cookies.getAll().some((cookie) => SESSION_COOKIE_RE.test(cookie.name));

  if (pathname.startsWith('/auth/callback')) {
    return supabaseResponse;
  }

  if (
    pathname.startsWith('/share') ||
    pathname.startsWith('/public') ||
    pathname.startsWith('/invite')
  ) {
    return supabaseResponse;
  }

  if (!user) {
    if (matches(pathname, AUTH_ROUTES)) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    if (hadSessionCookie) url.searchParams.set('authStatus', 'session_expired');
    return redirectWithSession(url, supabaseResponse);
  }

  const { ready, profile, hasMembership } = await resolveWorkspace(supabase, user.id);

  if (!profile) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('authStatus', matches(pathname, AUTH_ROUTES) ? 'profile_missing' : 'account_deleted');
    return redirectWithSession(url, supabaseResponse);
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('authStatus', 'account_deleted');
    return redirectWithSession(url, supabaseResponse);
  }

  if (matches(pathname, AUTH_ROUTES)) {
    const url = request.nextUrl.clone();
    url.pathname = ready ? '/' : '/onboarding';
    return redirectWithSession(url, supabaseResponse);
  }

  if (matches(pathname, ONBOARDING_ROUTES)) {
    if (pathname === '/create-team' || pathname.startsWith('/create-team/')) {
      return supabaseResponse;
    }
    if (ready) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return redirectWithSession(url, supabaseResponse);
    }
    return supabaseResponse;
  }

  if (!ready) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    if (profile.onboarding_completed && !hasMembership) {
      url.searchParams.set('authStatus', 'team_access_invalid');
    }
    return redirectWithSession(url, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

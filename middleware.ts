import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 보호 라우트 여부. 공개 라우트(메인·펀딩목록·상세·로그인 등)에서는
// 인증이 필요 없으므로 Supabase 왕복을 건너뛴다.
function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/create") ||
    pathname.startsWith("/mypage") ||
    /^\/funding\/[^/]+\/(admin|edit)/.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 공개 라우트: 인증 검사/세션 갱신 없이 그대로 통과.
  // (세션 토큰 갱신은 보호 라우트 방문 시 이 미들웨어가, 그 외에는
  //  브라우저 클라이언트/서버 액션이 각자 처리하므로 안전하다.)
  if (!isProtectedPath(pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

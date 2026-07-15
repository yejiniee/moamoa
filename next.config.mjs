/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // 공통 보안 헤더. (엄격한 CSP는 Kakao/Toss/Supabase SDK 튜닝이 필요해 별도 처리)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 클릭재킹 방지 — 다른 사이트가 우리 페이지를 iframe으로 못 싣게 한다
          { key: 'X-Frame-Options', value: 'DENY' },
          // MIME 스니핑 방지
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 외부로 나갈 때 전체 URL 대신 origin만 노출
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 안 쓰는 브라우저 기능 차단
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // HTTPS 강제 (Vercel은 HTTPS 서빙)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ]
  },
}
export default nextConfig

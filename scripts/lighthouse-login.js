/**
 * Lighthouse CI puppeteerScript.
 * 로그인이 필요한 페이지(/create, /funding, /admin, /edit 등)를 측정하기 전에
 * 테스트 계정으로 실제 로그인해서 인증 세션 쿠키를 만들어둔다.
 */
module.exports = async (browser, context) => {
  const email = process.env.LHCI_TEST_EMAIL
  const password = process.env.LHCI_TEST_PASSWORD

  if (!email || !password) {
    console.warn('[lighthouse-login] LHCI_TEST_EMAIL/LHCI_TEST_PASSWORD가 없어 로그인을 건너뜁니다')
    return
  }

  const origin = new URL(context.url).origin
  const page = await browser.newPage()

  try {
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle0' })

    if (new URL(page.url()).pathname === '/login') {
      await page.type('input[type="email"]', email, { delay: 20 })
      await page.type('input[type="password"]', password, { delay: 20 })

      const [loginButton] = await page.$x("//button[normalize-space(text())='로그인']")
      if (!loginButton) throw new Error('로그인 버튼을 찾지 못했습니다')

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        loginButton.click(),
      ])
    }
  } finally {
    await page.close()
  }
}

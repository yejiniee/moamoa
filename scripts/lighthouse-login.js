/**
 * Lighthouse CI puppeteerScript.
 * 로그인이 필요한 페이지(/create, /funding, /admin, /edit 등)를 측정하기 전에
 * 테스트 계정으로 실제 로그인해서 인증 세션 쿠키를 만들어둔다.
 *
 * 로그인에 실패해도 puppeteerScript 자체가 던지면 collect 전체가 실패하므로,
 * 여기서는 에러를 삼키고 익명 상태로라도 측정이 계속되게 한다.
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
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle0', timeout: 30000 })

    if (new URL(page.url()).pathname === '/login') {
      await page.type('input[type="email"]', email, { delay: 20 })
      await page.type('input[type="password"]', password, { delay: 20 })

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }),
        page.evaluate(() => {
          const button = Array.from(document.querySelectorAll('button')).find(
            (b) => b.textContent.trim() === '로그인'
          )
          if (!button) throw new Error('로그인 버튼을 찾지 못했습니다')
          button.click()
        }),
      ])
    }
  } catch (err) {
    console.warn('[lighthouse-login] 로그인 실패, 익명 상태로 계속 진행합니다:', err.message)
  } finally {
    await page.close()
  }
}

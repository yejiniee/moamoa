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
      // page.type()은 셀렉터를 기다려주지 않고 즉시 조회하기 때문에,
      // 각 입력 전에 명시적으로 waitForSelector로 실제 등장을 기다린다.
      await page.waitForSelector('input[type="email"]', { visible: true, timeout: 15000 })
      await page.type('input[type="email"]', email, { delay: 20 })

      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 15000 })
      await page.type('input[type="password"]', password, { delay: 20 })

      await page.waitForFunction(
        () => Array.from(document.querySelectorAll('button')).some((b) => b.textContent.trim() === '로그인'),
        { timeout: 15000 }
      )

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
    try {
      const debugInfo = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        inputs: Array.from(document.querySelectorAll('input')).map((el) => ({
          type: el.type,
          name: el.name,
          id: el.id,
        })),
        bodySnippet: document.body?.innerText?.slice(0, 300) ?? '',
      }))
      console.warn('[lighthouse-login] 실패 시점 페이지 상태:', JSON.stringify(debugInfo))
    } catch (debugErr) {
      console.warn('[lighthouse-login] 디버그 정보 수집도 실패:', debugErr.message)
    }
  } finally {
    await page.close()
  }
}

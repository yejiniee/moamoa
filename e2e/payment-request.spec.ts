import { test, expect } from '@playwright/test'
import { readFixture } from './fixtures/seed'

test('비로그인 후원자가 결제를 요청하면 결제창 연동이 시작된다', async ({ page }) => {
  const { fundingToken } = readFixture()

  await page.goto(`/funding/${fundingToken}/pay`)

  await page.getByRole('button', { name: '1만원' }).click()
  await page.getByLabel('이름').fill('E2E 후원자')

  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null),
    page.getByRole('button', { name: '선물하기' }).click(),
  ])

  // 설정 누락 등 클라이언트 에러 없이 결제 요청이 서버에서 성공적으로 처리되어야 한다
  await expect(page.getByText('결제 설정이 누락되었습니다')).not.toBeVisible()
  await expect(page.getByText('결제 중 오류가 발생했습니다')).not.toBeVisible()

  if (popup) {
    await expect(popup).toHaveURL(/toss/i)
    await popup.close()
  }
})

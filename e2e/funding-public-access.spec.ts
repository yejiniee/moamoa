import { test, expect } from '@playwright/test'
import { readFixture } from './fixtures/seed'

test.describe('비로그인 사용자의 펀딩 페이지 접근', () => {
  test('로그인 없이 펀딩 상세 페이지에 접근할 수 있다', async ({ page }) => {
    const { fundingToken } = readFixture()

    await page.goto(`/funding/${fundingToken}`)

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByText('[E2E] 테스트 펀딩')).toBeVisible()
  })

  test('로그인 없이 결제 페이지에 접근할 수 있다', async ({ page }) => {
    const { fundingToken } = readFixture()

    await page.goto(`/funding/${fundingToken}/pay`)

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /마음을 전해보세요/ })).toBeVisible()
  })

  test('상세 페이지의 선물하기 버튼으로 로그인 없이 결제 페이지에 진입한다', async ({ page }) => {
    const { fundingToken } = readFixture()

    await page.goto(`/funding/${fundingToken}`)
    await page.getByRole('link', { name: /선물하기/ }).click()

    await expect(page).toHaveURL(new RegExp(`/funding/${fundingToken}/pay$`))
  })
})

import { test, expect } from '@playwright/test'
import { readFixture } from './fixtures/seed'

test('로그인한 사용자가 펀딩을 생성하고 상세 페이지에서 확인한다', async ({ page }) => {
  const { testUserEmail, testUserPassword } = readFixture()

  await page.goto('/login')
  await page.getByLabel('이메일').fill(testUserEmail)
  await page.getByLabel('비밀번호').fill(testUserPassword)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/create')

  const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  await page.getByLabel(/제목/).fill('E2E로 만든 생일 펀딩')
  await page.getByLabel(/마감일/).fill(endDate)
  await page.getByLabel(/목표 금액/).fill('50000')
  await page.getByRole('button', { name: /펀딩 만들기/ }).click()

  await expect(page.getByText('펀딩이 만들어졌어요!')).toBeVisible()

  await page.getByRole('button', { name: /펀딩 페이지 보러가기/ }).click()
  await expect(page.getByText('E2E로 만든 생일 펀딩')).toBeVisible()
})

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import MyPageAccountForm from './MyPageAccountForm'
import MyPagePasswordForm from './MyPagePasswordForm'
import MyPageLogoutButton from './MyPageLogoutButton'

export default async function MyPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('bank_name, account_number, account_holder')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <main className="px-4 py-6 flex flex-col gap-8">
      <h1 className="text-xl font-bold text-gray-900">마이페이지</h1>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800">정산 계좌</h2>
          <p className="text-sm text-gray-400">펀딩 정산 시 자동으로 채워져요</p>
        </div>
        <MyPageAccountForm
          initial={{
            bankName: profile?.bank_name ?? '',
            accountNumber: profile?.account_number ?? '',
            accountHolder: profile?.account_holder ?? '',
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-gray-800">비밀번호 바꾸기</h2>
        <MyPagePasswordForm />
      </section>

      <section className="flex flex-col gap-3">
        <MyPageLogoutButton />
      </section>
    </main>
  )
}

# 🎁 모아모아 (MoaMoa)

**친구들과 함께 모아서 선물하는 생일선물 펀딩 서비스**
#### 👉 [서비스 바로가기](https://moamoa-xi.vercel.app/login)


생일자 혹은 지인이 펀딩을 만들고 링크를 공유하면, 참여자들은 **로그인 없이** 원하는 금액을 결제해 마음을 보탤 수 있어요. 모인 금액은 주최자에게 정산됩니다.

## 🔑 테스트 계정

아래 계정으로 로그인하세요.

| 항목 | 값 |
|---|---|
| 이메일 | `test@example.com` |
| 비밀번호 | `qwer1234!` |


## 🔄 서비스 흐름

1. **주최자**가 이메일로 가입하고 펀딩을 생성하면 고유 공유 링크가 발급됩니다.
2. **참여자**는 링크로 접속해 이름·메시지·금액을 입력하고 토스페이먼츠로 결제합니다.
3. 결제는 `/api/payment/confirm`에서 서버 측 검증을 거쳐 기록되고, 펀딩 페이지의 모금 현황이 실시간으로 갱신됩니다.
4. 펀딩 마감 후 주최자는 관리 페이지에서 **정산을 요청**합니다.

> ⚠️ 현재 결제는 **토스페이먼츠 테스트 모드**로 동작하며 실제 금액이 청구되지 않습니다.

## 🎬 데모
<table>
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="로그인 후 펀딩리스트 확인" src="https://github.com/user-attachments/assets/294d0156-ed9d-412e-ae5c-d823b6605d1c" />
    </td>
    <td valign="top" width="50%">
      <br />
      <strong>로그인하기</strong>
      <p>로그 후 내가 생성한 펀딩을 확인할 수 있습니다. 관리 버튼을 누르면 펀딩을 수정/삭제/마감 처리할 수 있습니다.</p>
    </td>
  </tr>
</table>
<table>
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="펀딩 생성하기" src="https://github.com/user-attachments/assets/a77f9e83-35ae-42ce-bd09-bf719b33ea2e" />
    </td>
    <td valign="top" width="50%">
      <br />
      <strong>펀딩을 생성합니다.</strong>
      <p>원하는 선물의 이미지(옵션), 제목, 설명(옵션), 마감일자, 금액을 적고 생일선물 펀딩을 생성합니다. 링크를 복사하여 공유할 수 있습니다.</p>
    </td>
  </tr>
</table>
<table width="100%">
  <!-- 첫 번째 행: 펀딩 참여하기 -->
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="펀딩 참여하기" src="https://github.com/user-attachments/assets/738dff46-773d-4e82-b46f-b652062c50ff" />
    </td>
    <td valign="top" width="50%">
      <br />
      <strong>펀딩에 참여합니다.</strong>
      <p>공유받은 링크로 접속하여 선물하기에 참여합니다. 선물할 금액과 이름, 메시지를 적고 결제합니다.</p>
    </td>
  </tr>
  <!-- 두 번째 행: 카톡 공유하기 (여기에 합쳤습니다) -->
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="카톡 공유하기" src="https://github.com/user-attachments/assets/3c872adf-7c7a-40c0-ac97-15f1aef03b19" />
    </td>
    <td valign="top" width="50%">
      <br />
      <strong>펀딩 참여 후 주최자에게 결과를 공유할 수 있습니다.</strong>
    </td>
  </tr>
</table>
<table>
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="펀딩 정산하기" src="https://github.com/user-attachments/assets/7e2fff57-232f-46ff-8ff4-2d13815c312c" />
    </td>
    <td valign="top" width="50%">
      <br />
      <strong>펀딩을 마감하고 정산합니다.</strong>
      <p>테스트 목적으로 제공되는 기능입니다. 정산 요청 시 실제 계좌로 입금되지 않으며, 시스템 내부 데이터(정산 테이블)에만 기록됩니다.</p>
    </td>
  </tr>
</table>
## ✨ 주요 기능

- **펀딩 생성** — 이메일 회원가입 후 선물(이름·목표금액·이미지)을 등록해 펀딩 개설
- **링크 공유** — `share_token` 기반 공유 링크로 누구나 접근 가능 (참여자 로그인 불필요)
- **간편 결제** — 토스페이먼츠 결제창으로 참여 (현재 테스트 모드)
- **실시간 현황** — Supabase Realtime으로 결제가 발생하면 모금 현황이 자동 갱신
- **카카오 공유** — 카카오 공유 SDK로 펀딩 링크 공유
- **관리 페이지** — 주최자 전용 페이지에서 펀딩 수정·마감·정산 요청
- **마이 페이지** — 마이 페이지에서 계좌 등록·수정 및 비밀번호 변경

## 🛠 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router), React 18, TypeScript |
| 스타일링 | Tailwind CSS |
| DB / Auth / Realtime | Supabase (PostgreSQL) |
| 결제 | 토스페이먼츠 SDK |
| 테스트 | Vitest (단위), Playwright (E2E) |
| CI | GitHub Actions (E2E, Lighthouse) |

## 📁 프로젝트 구조

```
moamoa/
├── app/                    # Next.js App Router 페이지
│   ├── api/payment/confirm/  # 토스페이먼츠 결제 서버 검증 API
│   ├── create/               # 펀딩 생성
│   ├── funding/               # 펀딩 목록
│   │   └── [token]/           # 펀딩 상세 (공유 링크)
│   │       ├── admin/         # 주최자 관리 페이지
│   │       ├── edit/          # 펀딩 수정
│   │       └── pay/           # 결제 참여
│   ├── login/ · register/     # 주최자 로그인 / 회원가입
│   └── payment/               # 결제 성공 / 실패
├── components/             # UI · 펀딩 · 결제 컴포넌트
├── lib/                    # Supabase 클라이언트, 유틸
├── supabase/               # DB 스키마 (schema.sql)
├── e2e/                    # Playwright E2E 테스트
└── docs/                   # 설계 문서
```


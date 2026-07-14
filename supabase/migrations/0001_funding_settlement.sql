-- 정산(인출) 기능 추가
-- Supabase SQL Editor에서 실행하세요.
--
-- 상태 흐름: active(진행중) → closed(마감) → settled(정산완료)
--  - 마감(close):   펀딩 종료. 더 이상 선물(결제)을 받지 않음
--  - 정산(settle):  마감된 펀딩의 모인 금액을 인출(기록). 계좌 정보와 금액을 기록

-- 1) status 체크 제약에 'settled' 추가
alter table fundings drop constraint if exists fundings_status_check;
alter table fundings
  add constraint fundings_status_check
  check (status in ('active', 'closed', 'settled'));

-- 2) 정산 기록용 컬럼 추가
alter table fundings add column if not exists settled_at            timestamptz;
alter table fundings add column if not exists settled_amount        integer;
alter table fundings add column if not exists settle_bank_name      text;
alter table fundings add column if not exists settle_account_number text;
alter table fundings add column if not exists settle_account_holder text;

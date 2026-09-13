-- ============================================================
-- หนี้เพื่อน — Supabase schema (v2: bill / ower structure)
-- ใช้กับ Supabase (Postgres) + Vercel
-- รันทั้งไฟล์นี้ใน Supabase SQL Editor
-- แทนที่ schema เดิม (groups/debts แบบ v1) ทั้งหมด
-- ============================================================

-- ------------------------------------------------------------
-- 0. เคลียร์ของเก่า (ถ้าเคยรัน schema v1 ไปแล้ว) — ข้ามได้ถ้าเป็นโปรเจกต์ใหม่
-- ------------------------------------------------------------
drop view if exists public.member_balances;
drop table if exists public.debts cascade;

-- ------------------------------------------------------------
-- 1. profiles — ผูกกับ auth.users ของ Supabase โดยตรง
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. groups
-- ------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. group_members — สมาชิกแต่ละคนในกลุ่ม
-- ------------------------------------------------------------
create type public.member_status as enum ('invited', 'joined');

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  invited_email text,
  display_name text not null,
  status public.member_status not null default 'invited',
  invited_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, invited_email)
);

create index idx_group_members_group on public.group_members(group_id);
create index idx_group_members_user on public.group_members(user_id);

-- ------------------------------------------------------------
-- 4. bills — หนึ่งแถว = หนึ่งรายการบิล (เช่น "คาราโอเกะ", "กินข้าว")
-- creator_member_id คือคนที่สร้างบิลนี้ / เป็นคนได้รับเงิน / คนเดียวที่
-- มีสิทธิ์ยืนยันว่าใครจ่ายแล้วบ้าง
-- ------------------------------------------------------------
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  category text,
  creator_member_id uuid not null references public.group_members(id) on delete cascade,
  payment_channel text,
  due_date date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_bills_group on public.bills(group_id);
create index idx_bills_creator on public.bills(creator_member_id);
create index idx_bills_due_date on public.bills(due_date);

-- ------------------------------------------------------------
-- 5. bill_owers — คนที่ติดหนี้ในบิลนั้น พร้อมสถานะการจ่าย
-- unpaid    = ยังไม่จ่าย
-- submitted = แนบสลิปแล้ว รอเจ้าของบิลยืนยัน
-- confirmed = เจ้าของบิลยืนยันว่าได้รับเงินแล้ว
-- ------------------------------------------------------------
create type public.payment_status as enum ('unpaid', 'submitted', 'confirmed');

create table public.bill_owers (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status public.payment_status not null default 'unpaid',
  slip_url text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bill_id, member_id)
);

create index idx_bill_owers_bill on public.bill_owers(bill_id);
create index idx_bill_owers_member on public.bill_owers(member_id);
create index idx_bill_owers_status on public.bill_owers(status) where status <> 'confirmed';

-- บังคับลำดับสถานะให้เดินไปข้างหน้าเท่านั้น (unpaid -> submitted -> confirmed)
-- และเติม timestamp ให้อัตโนมัติ กันแอปฝั่ง client ส่งค่าผิดลำดับมา
create function public.enforce_payment_status_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if old.status = 'confirmed' and new.status <> 'confirmed' then
      raise exception 'ย้อนสถานะที่ยืนยันแล้วไม่ได้';
    end if;
    if old.status = 'unpaid' and new.status = 'confirmed' then
      raise exception 'ต้องแนบสลิปก่อนจะยืนยันจ่ายได้';
    end if;
  end if;

  if new.status = 'submitted' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  if new.status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at := now();
  end if;

  return new;
end;
$$;

create trigger trg_payment_status_transition
  before update on public.bill_owers
  for each row execute procedure public.enforce_payment_status_transition();

-- ------------------------------------------------------------
-- 6. helper functions (security definer เพื่อเลี่ยง infinite recursion ใน RLS)
-- ------------------------------------------------------------
create function public.is_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create function public.is_bill_creator(p_bill_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.bills b
    join public.group_members gm on gm.id = b.creator_member_id
    where b.id = p_bill_id and gm.user_id = p_user_id
  );
$$;

create function public.owns_member_row(p_member_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where id = p_member_id and user_id = p_user_id
  );
$$;

-- ------------------------------------------------------------
-- 7. Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.bills enable row level security;
alter table public.bill_owers enable row level security;

-- profiles
create policy "profiles readable by authenticated users"
  on public.profiles for select to authenticated using (true);

create policy "users update own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- groups
create policy "members can view their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id, auth.uid()));

create policy "authenticated users can create groups"
  on public.groups for insert to authenticated
  with check (created_by = auth.uid());

create policy "creator can delete group"
  on public.groups for delete to authenticated
  using (created_by = auth.uid());

-- group_members
create policy "members can view group roster"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

create policy "members can invite others to their group"
  on public.group_members for insert to authenticated
  with check (public.is_group_member(group_id, auth.uid()) or invited_by = auth.uid());

create policy "invited user can accept own invite"
  on public.group_members for update to authenticated
  using (invited_email = (select email from public.profiles where id = auth.uid()))
  with check (user_id = auth.uid());

-- bills: ทุกคนในกลุ่มเห็นหัวข้อ/ยอดรวม/กำหนดจ่ายได้ (แต่รายละเอียดคนติดหนี้แต่ละคน
-- ถูกจำกัดอีกชั้นที่ bill_owers ด้านล่าง)
create policy "members can view bills in their group"
  on public.bills for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

create policy "members can create bills in their group"
  on public.bills for insert to authenticated
  with check (
    public.is_group_member(group_id, auth.uid())
    and public.owns_member_row(creator_member_id, auth.uid())
    and created_by = auth.uid()
  );

create policy "only bill creator can update bill"
  on public.bills for update to authenticated
  using (public.is_bill_creator(id, auth.uid()));

create policy "only bill creator can delete bill"
  on public.bills for delete to authenticated
  using (public.is_bill_creator(id, auth.uid()));

-- bill_owers: จุดสำคัญ — คนทั่วไปเห็นได้แค่แถวของตัวเอง เจ้าของบิลเห็นได้ทุกแถว
create policy "creator sees all owers, member sees own row only"
  on public.bill_owers for select to authenticated
  using (
    public.is_bill_creator(bill_id, auth.uid())
    or public.owns_member_row(member_id, auth.uid())
  );

create policy "only bill creator adds owers"
  on public.bill_owers for insert to authenticated
  with check (public.is_bill_creator(bill_id, auth.uid()));

-- ower เจ้าของแถวแนบสลิปได้ (unpaid -> submitted)
-- เจ้าของบิลยืนยันได้ (submitted -> confirmed)
-- ลำดับสถานะที่ถูกต้องถูกบังคับซ้ำอีกชั้นด้วย trigger ด้านบน
create policy "ower submits own slip or creator confirms"
  on public.bill_owers for update to authenticated
  using (
    public.owns_member_row(member_id, auth.uid())
    or public.is_bill_creator(bill_id, auth.uid())
  );

create policy "only bill creator deletes an ower row"
  on public.bill_owers for delete to authenticated
  using (public.is_bill_creator(bill_id, auth.uid()));

-- ------------------------------------------------------------
-- 8. views สรุปผล ใช้ทำหน้ารายการบิล/แจ้งเตือนได้เลย
-- (คำนวณผ่าน security definer เพื่อให้เห็นยอดรวมได้ แม้แถวรายคนจะถูกซ่อน)
-- ------------------------------------------------------------
create view public.bill_progress as
select
  b.id as bill_id,
  b.group_id,
  b.title,
  b.category,
  b.due_date,
  b.creator_member_id,
  coalesce(sum(o.amount), 0) as total_amount,
  coalesce(sum(o.amount) filter (where o.status = 'confirmed'), 0) as paid_amount,
  count(o.id) as ower_count,
  count(o.id) filter (where o.status = 'confirmed') as confirmed_count,
  (count(o.id) > 0 and count(o.id) filter (where o.status <> 'confirmed') = 0) as is_complete
from public.bills b
left join public.bill_owers o on o.bill_id = b.id
group by b.id, b.group_id, b.title, b.category, b.due_date, b.creator_member_id;

-- แถวของ "ฉัน" ในทุกบิล — ใช้ต่อกับหน้าแจ้งเตือน / เช็คว่าใครยังไม่จ่าย
create view public.my_ower_rows as
select
  o.id as ower_id,
  o.bill_id,
  o.member_id,
  o.amount,
  o.status,
  o.slip_url,
  b.title as bill_title,
  b.group_id,
  b.due_date
from public.bill_owers o
join public.bills b on b.id = o.bill_id
join public.group_members gm on gm.id = o.member_id
where gm.user_id = auth.uid();

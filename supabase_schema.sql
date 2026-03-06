-- 投了吗 · Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 里粘贴执行

create table if not exists jobs (
  id          uuid primary key default gen_random_uuid(),
  company     text not null,
  position    text not null,
  status      text not null default '待投递'
              check (status in ('待投递','已投递','笔试','一面','终面','Offer','已拒绝')),
  city        text,
  channel     text,
  deadline    date,
  priority    smallint default 2 check (priority in (1,2,3)),
  notes       text,
  jd_url      text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 自动更新 updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger jobs_updated_at
  before update on jobs
  for each row execute function update_updated_at();

-- Demo 阶段：开放访问（无需登录）
-- 上线后替换为 auth.uid() 用户隔离
alter table jobs enable row level security;
create policy "demo_open" on jobs for all using (true) with check (true);

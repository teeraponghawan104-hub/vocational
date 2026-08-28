-- 1. สร้างตารางเก็บข้อมูลผลคะแนน (assessments)
create table if not exists assessments (
  id text primary key,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. สร้างตารางสำหรับระบบล็อค (locks) ป้องกันการสอบซ้อน
create table if not exists locks (
  student_id text primary key,
  session_id text not null,
  updated_at bigint not null
);

-- 3. เปิดระบบรักษาความปลอดภัย (RLS) แต่ยอมรับการเข้าถึงแบบ Public (เพราะเป็นข้อสอบเปิด)
alter table assessments enable row level security;
create policy "Allow public read assessments" on assessments for select using (true);
create policy "Allow public insert assessments" on assessments for insert with check (true);
create policy "Allow public update assessments" on assessments for update using (true) with check (true);
create policy "Allow public delete assessments" on assessments for delete using (true);

alter table locks enable row level security;
create policy "Allow public all locks" on locks for all using (true) with check (true);

-- 4. เปิดระบบ Realtime ให้มันทำงานทันทีเมื่อมีการเปลี่ยนแปลง
alter publication supabase_realtime add table assessments;
alter publication supabase_realtime add table locks;

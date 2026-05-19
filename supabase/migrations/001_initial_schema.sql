create extension if not exists pgcrypto;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  country_name text not null,
  description text,
  original_file_path text not null,
  extracted_csv_path text,
  updated_csv_path text,
  exception_csv_path text,
  status text not null default 'uploaded',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists extracted_rows (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  row_index int not null,
  date text,
  ref_no text,
  batch_no text,
  expiry_date text,
  issued_to_or_received_from text,
  quantity_received text,
  quantity_issued text,
  losses_and_adjustments text,
  balance text,
  remarks text,
  name_and_signature text,
  confidence_json jsonb,
  reviewed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists comparison_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  master_csv_path text not null,
  matched_count int default 0,
  unmatched_count int default 0,
  updated_csv_path text,
  exception_csv_path text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists extracted_rows_document_id_idx on extracted_rows(document_id);
create index if not exists comparison_results_document_id_idx on comparison_results(document_id);
create index if not exists audit_logs_document_id_idx on audit_logs(document_id);

alter table documents enable row level security;
alter table extracted_rows enable row level security;
alter table comparison_results enable row level security;
alter table audit_logs enable row level security;

-- This app performs data operations through secure Next.js API routes using the
-- Supabase service role key. No public RLS policies are required for v1.

insert into storage.buckets (id, name, public)
values
  ('original-documents', 'original-documents', false),
  ('generated-csv', 'generated-csv', false),
  ('master-csv', 'master-csv', false)
on conflict (id) do nothing;

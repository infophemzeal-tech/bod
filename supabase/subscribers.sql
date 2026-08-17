create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),

  -- personal data
  title text not null default 'Mr',
  surname text not null,
  other_names text not null,
  date_of_birth date,
  email text,
  phone text not null,
  contact_address text,

  -- employment history
  profession text,
  occupation text,
  employer_name text,
  employer_phone text,
  employer_address text,

  -- subscription details
  payment_option text not null check (payment_option in ('Outright', 'Quarterly', 'Monthly')),
  number_of_plots numeric(4, 1) not null default 0.5,
  preferred_estate text not null,
  plot_preference text[] not null default '{}',
  plot_preference_other text,

  -- referral
  referrer_name text,
  referrer_occupation text,
  referrer_phone text,
  referrer_address text,

  status text not null default 'draft' check (status in ('draft', 'registered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

-- Adjust policies once auth/roles are wired up. Placeholder: authenticated users can read/write.
create policy "Authenticated users can manage subscribers"
  on public.subscribers
  for all
  to authenticated
  using (true)
  with check (true);

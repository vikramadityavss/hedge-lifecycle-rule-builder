-- SQL migration script for Supabase
-- Create tables for hedge lifecycle rule builder

-- Enable RLS (Row Level Security)
alter table if exists public.users enable row level security;

-- Create profiles table
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text unique not null,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- Enable RLS on profiles
alter table if exists public.profiles enable row level security;

-- Create rules table
create table if not exists public.rules (
    id text primary key,
    name text not null,
    description text,
    conditions jsonb not null default '{}'::jsonb,
    actions jsonb not null default '[]'::jsonb,
    status text not null default 'draft',
    priority text not null default 'medium',
    category text,
    tags text[],
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    created_by uuid references auth.users,
    updated_by uuid references auth.users
);

-- Enable RLS on rules
alter table if exists public.rules enable row level security;

-- Create lifecycle_stages table
create table if not exists public.lifecycle_stages (
    id text primary key,
    name text not null,
    description text,
    sequence integer not null default 0,
    status text not null default 'active',
    icon text default 'pi pi-star',
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    created_by uuid references auth.users,
    updated_by uuid references auth.users
);

-- Enable RLS on lifecycle_stages
alter table if exists public.lifecycle_stages enable row level security;

-- Create stage_rules mapping table
create table if not exists public.stage_rules (
    id uuid primary key default uuid_generate_v4(),
    stage_id text references lifecycle_stages on delete cascade not null,
    rule_id text references rules on delete cascade not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    unique(stage_id, rule_id)
);

-- Enable RLS on stage_rules
alter table if exists public.stage_rules enable row level security;

-- Create field_definitions table
create table if not exists public.field_definitions (
    id text primary key,
    name text not null,
    type text not null,
    options jsonb,
    description text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    created_by uuid references auth.users,
    updated_by uuid references auth.users
);

-- Enable RLS on field_definitions
alter table if exists public.field_definitions enable row level security;

-- Insert default field definitions
insert into public.field_definitions (id, name, type, options, description) values
('hedgeId', 'Hedge ID', 'string', null, 'Unique identifier for the hedge'),
('hedgeType', 'Hedge Type', 'select', '[{"value":"interest_rate","label":"Interest Rate"},{"value":"fx","label":"Foreign Exchange"},{"value":"commodity","label":"Commodity"}]', 'Type of hedge'),
('amount', 'Amount', 'number', null, 'Hedge amount'),
('tradeDate', 'Trade Date', 'date', null, 'Date the hedge was traded'),
('maturityDate', 'Maturity Date', 'date', null, 'Date the hedge matures'),
('status', 'Status', 'select', '[{"value":"active","label":"Active"},{"value":"pending","label":"Pending"},{"value":"matured","label":"Matured"},{"value":"terminated","label":"Terminated"}]', 'Current status of the hedge'),
('counterparty', 'Counterparty', 'string', null, 'Counterparty of the hedge')
on conflict (id) do nothing;

-- Create policies for authenticated users

-- Profiles policies
create policy "Users can view their own profile" 
on profiles for select
using (auth.uid() = id);

create policy "Users can update their own profile" 
on profiles for update
using (auth.uid() = id);

-- Rules policies
create policy "Authenticated users can view rules" 
on rules for select
to authenticated;

create policy "Authenticated users can insert rules" 
on rules for insert
to authenticated
with check (true);

create policy "Users can update rules they created" 
on rules for update
to authenticated
using (auth.uid()::text = created_by::text);

create policy "Users can delete rules they created" 
on rules for delete
to authenticated
using (auth.uid()::text = created_by::text);

-- Lifecycle stages policies
create policy "Authenticated users can view lifecycle stages" 
on lifecycle_stages for select
to authenticated;

create policy "Authenticated users can insert lifecycle stages" 
on lifecycle_stages for insert
to authenticated
with check (true);

create policy "Users can update lifecycle stages they created" 
on lifecycle_stages for update
to authenticated
using (auth.uid()::text = created_by::text);

create policy "Users can delete lifecycle stages they created" 
on lifecycle_stages for delete
to authenticated
using (auth.uid()::text = created_by::text);

-- Stage rules policies
create policy "Authenticated users can view stage rules" 
on stage_rules for select
to authenticated;

create policy "Authenticated users can insert stage rules" 
on stage_rules for insert
to authenticated
with check (true);

create policy "Users can update stage rules they created" 
on stage_rules for update
to authenticated
using (auth.uid()::text = created_by::text);

create policy "Users can delete stage rules they created" 
on stage_rules for delete
to authenticated
using (auth.uid()::text = created_by::text);

-- Field definitions policies
create policy "Authenticated users can view field definitions" 
on field_definitions for select
to authenticated;

-- Create functions and triggers for updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
before update on profiles
for each row execute procedure update_updated_at_column();

create trigger update_rules_updated_at
before update on rules
for each row execute procedure update_updated_at_column();

create trigger update_lifecycle_stages_updated_at
before update on lifecycle_stages
for each row execute procedure update_updated_at_column();

create trigger update_stage_rules_updated_at
before update on stage_rules
for each row execute procedure update_updated_at_column();

create trigger update_field_definitions_updated_at
before update on field_definitions
for each row execute procedure update_updated_at_column();
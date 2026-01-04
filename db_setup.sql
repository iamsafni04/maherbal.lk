-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Users Table
create table users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  password text not null,
  is_admin boolean default false,
  cart jsonb default '[]',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Products Table
create table products (
  id bigint primary key, -- Keeping bigint to match Date.now() logic, or use uuid
  name text not null,
  price numeric not null,
  description text,
  category text,
  unit text,
  weight numeric default 0,
  sale_type text default 'normal',
  active boolean default true,
  variants jsonb default '[]',
  image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Orders Table
create table orders (
  order_id bigint primary key,
  user_email text references users(email), -- Linking by email to keep it simple with current logic or use user_id
  customer_info jsonb not null,
  items jsonb not null,
  total numeric not null,
  payment_method text not null,
  status text default 'Processing',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Storage Bucket Policies (Run this in SQL Editor)
-- Note: You must manually create a storage bucket named 'products' in the Supabase Dashboard > Storage.
-- Then apply these policies:

-- ALLOW PUBLIC READ ACCESS
-- create policy "Public Access"
-- on storage.objects for select
-- using ( bucket_id = 'products' );

-- ALLOW AUTHENTICATED UPLOAD (or Admin only if you implement RLS)
-- create policy "Authenticated Upload"
-- on storage.objects for insert
-- with check ( bucket_id = 'products' );

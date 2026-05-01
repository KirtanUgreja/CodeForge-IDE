-- Create projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  repo_url text not null,
  repo_full_name text not null,
  is_private boolean default false,
  environment text default 'base',
  last_opened timestamptz default now(),
  created_at timestamptz default now()
);

-- Create project collaborators table FIRST before referencing it
create table if not exists public.project_collaborators (
    id uuid default gen_random_uuid() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    user_id uuid references auth.users(id) not null,
    added_at timestamptz default now(),
    unique(project_id, user_id)
);

-- Enable Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.project_collaborators enable row level security;

-- DROP OLD POLICIES that conflict
drop policy if exists "Users can view their own projects" on public.projects;
drop policy if exists "Users can view projects" on public.projects;
drop policy if exists "Users can insert their own projects" on public.projects;
drop policy if exists "Users can update their own projects" on public.projects;
drop policy if exists "Users can delete their own projects" on public.projects;
drop policy if exists "Project owners can manage collaborators" on public.project_collaborators;
drop policy if exists "Users can view collaborations" on public.project_collaborators;

-- Create policies for projects
create policy "Users can view projects"
  on public.projects for select
  using (
      auth.uid() = user_id 
      or is_private = false
      or exists (
          select 1 from public.project_collaborators 
          where project_id = projects.id and user_id = auth.uid()
      )
  );

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Create policies for collaborators table
create policy "Project owners can manage collaborators"
    on public.project_collaborators for all
    using (
        exists (
            select 1 from public.projects
            where projects.id = project_collaborators.project_id
            and projects.user_id = auth.uid()
        )
    );

create policy "Users can view collaborations"
    on public.project_collaborators for select
    using (user_id = auth.uid());

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- PROFILES (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null,
  avatar_initials text not null,  -- e.g. "PM" derived from name
  role text not null default 'member', -- admin | member | viewer
  created_at timestamptz default now()
);

-- Automatically create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  initials text;
  parts text[];
begin
  parts := string_to_array(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ');
  initials := upper(left(parts[1], 1)) || coalesce(upper(left(parts[2], 1)), '');
  insert into profiles (id, name, email, avatar_initials, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    initials,
    'member'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- WORKSPACES
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- WORKSPACE MEMBERS
create table workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text not null default 'member', -- admin | member | viewer
  invited_by uuid references profiles(id),
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

-- WORKSPACE INVITES
create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  invited_by uuid references profiles(id),
  accepted boolean default false,
  created_at timestamptz default now(),
  unique (workspace_id, email)
);

-- PROJECTS
create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  emoji text default '📋',
  color text default '#3b82f6',
  position int default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- GROUPS (sections within a project)
create table groups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  position int default 0,
  created_at timestamptz default now()
);

-- TASKS
create table tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade, -- null = top-level task, set = subtask
  title text not null,
  description text default '',
  status text not null default 'todo',
    -- values: todo | inprogress | discussion | review | testing | blocked | done
  priority text not null default 'medium',
    -- values: urgent | high | medium | low
  assignee_id uuid references profiles(id) on delete set null,
  due_date date,
  labels text[] default '{}',
  position int default 0,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger tasks_updated_at before update on tasks
  for each row execute procedure update_updated_at();

-- COMMENTS
create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  text text not null,
  created_at timestamptz default now()
);

-- ACTIVITY LOG
create table activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,  -- e.g. "changed status to In Progress", "assigned to Priya M."
  created_at timestamptz default now()
);

-- ATTACHMENTS
create table attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  filename text not null,
  storage_path text not null,  -- path in supabase storage bucket
  size_bytes int,
  mime_type text,
  created_at timestamptz default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table projects enable row level security;
alter table groups enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;
alter table activity enable row level security;
alter table attachments enable row level security;

-- Helper: is current user a member of workspace?
create or replace function is_workspace_member(wid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = wid and user_id = auth.uid()
  );
$$;

-- Helper: is current user admin of workspace?
create or replace function is_workspace_admin(wid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = wid and user_id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: users can read all profiles in their workspaces, update own
create policy "Read profiles in workspace" on profiles for select
  using (
    id = auth.uid() or
    exists (
      select 1 from workspace_members wm1
      join workspace_members wm2 on wm1.workspace_id = wm2.workspace_id
      where wm1.user_id = auth.uid() and wm2.user_id = profiles.id
    )
  );
create policy "Update own profile" on profiles for update using (id = auth.uid());

-- Workspaces: members can view, admins can update
create policy "Members can view workspace" on workspaces for select
  using (is_workspace_member(id));
create policy "Admins can update workspace" on workspaces for update
  using (is_workspace_admin(id));
create policy "Authenticated users can create workspaces" on workspaces for insert
  with check (auth.uid() is not null);

-- Workspace members
create policy "Members can view members" on workspace_members for select
  using (is_workspace_member(workspace_id));
create policy "Admins can manage members" on workspace_members for all
  using (is_workspace_admin(workspace_id));

-- Invites
create policy "Admins and members can invite" on workspace_invites for insert
  with check (is_workspace_member(workspace_id));
create policy "Members can view invites" on workspace_invites for select
  using (is_workspace_member(workspace_id));

-- Projects
create policy "Members can view projects" on projects for select
  using (is_workspace_member(workspace_id));
create policy "Members can create projects" on projects for insert
  with check (is_workspace_member(workspace_id));
create policy "Members can update projects" on projects for update
  using (is_workspace_member(workspace_id));
create policy "Admins can delete projects" on projects for delete
  using (is_workspace_admin(workspace_id));

-- Groups, tasks, comments, activity, attachments: inherit from project membership
-- Use a helper to get workspace_id from task
create or replace function task_workspace_id(tid uuid)
returns uuid language sql security definer as $$
  select p.workspace_id from tasks t
  join groups g on t.group_id = g.id
  join projects p on g.project_id = p.id
  where t.id = tid;
$$;

create policy "Members can CRUD groups" on groups for all
  using (exists (
    select 1 from projects p
    join workspace_members wm on p.workspace_id = wm.workspace_id
    where p.id = groups.project_id and wm.user_id = auth.uid()
  ));

create policy "Members can CRUD tasks" on tasks for all
  using (is_workspace_member(task_workspace_id(id)));

create policy "Members can CRUD comments" on comments for all
  using (is_workspace_member(task_workspace_id(task_id)));

create policy "Members can read activity" on activity for select
  using (is_workspace_member(task_workspace_id(task_id)));

create policy "Members can insert activity" on activity for insert
  with check (is_workspace_member(task_workspace_id(task_id)));

create policy "Members can CRUD attachments" on attachments for all
  using (is_workspace_member(task_workspace_id(task_id)));

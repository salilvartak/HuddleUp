# TASKFLOW — ANTIGRAVITY BUILD PROMPT
# Self-contained agent prompt. Feed entirely to Claude Code / Cursor. Zero clarifying questions. Build everything end-to-end.

---

## MISSION

Build **TaskFlow** — a dark, VS Code / Raycast-aesthetic task management web application for small startups. Think Linear meets ClickUp but stripped to essential power. Full-stack: React + Tailwind frontend, Supabase backend (Postgres + Auth + Storage + Realtime).

Do not ask any questions. Resolve all ambiguity using the decisions documented below. Build the complete application from scratch.

---

## TECH STACK

| Layer        | Choice                                              |
|--------------|-----------------------------------------------------|
| Frontend     | React 18 + Vite                                     |
| Styling      | Tailwind CSS v3 (utility-first, no component libs)  |
| State        | React Context + useState (no Redux, no Zustand)     |
| Backend      | Supabase (Postgres, Auth, Storage, Realtime)        |
| Auth         | Supabase Auth — Google OAuth only                   |
| File uploads | Supabase Storage bucket: `task-attachments`         |
| Deployment   | Vercel (static frontend + Supabase as backend)      |

---

## REPOSITORY STRUCTURE

```
taskflow/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── .env.example
├── supabase/
│   └── schema.sql           # Full DB schema + RLS policies
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── lib/
│   │   └── supabase.js      # Supabase client
│   ├── context/
│   │   └── AppContext.jsx   # Global app state + data fetching
│   ├── hooks/
│   │   ├── useAuth.js       # Auth state, login, logout
│   │   ├── useTasks.js      # Task CRUD + realtime subscription
│   │   └── useMembers.js    # Workspace members
│   ├── data/
│   │   └── constants.js     # STATUSES, PRIORITIES (not from DB)
│   └── components/
│       ├── Sidebar.jsx
│       ├── MainContent.jsx
│       ├── ListView.jsx
│       ├── KanbanView.jsx
│       ├── TaskModal.jsx
│       ├── InviteModal.jsx
│       ├── AuthScreen.jsx
│       └── Badges.jsx       # StatusBadge, PriorityBadge, Avatar, etc.
```

---

## VISUAL DESIGN SPEC

### Palette (dark-only — no light mode)
```
Background primary:   #0e0e10
Background surface:   #0c0c0f
Background elevated:  #12121a
Background input:     #16161e
Border subtle:        #1a1a22
Border default:       #22222e
Border interactive:   #2a2a38
Text primary:         #e0e0e8
Text secondary:       #c0c0cc
Text muted:           #9999aa
Text dim:             #6a6a7a
Text faint:           #3a3a4a
Accent blue:          #3b82f6
```

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif`
- Font sizes: 10px (labels/meta), 11px (badges/chips), 12px (secondary text), 13px (body/task titles), 14px (modal body), 15px (section headers), 18px (modal title)
- Font weights: 400 (body), 500 (medium), 600 (semibold headings only)

### Scrollbars (global CSS)
```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a36; border-radius: 2px; }
::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }
```

### Component rules
- All dropdowns: `bg-[#16161e] border border-[#2a2a36] rounded-lg shadow-2xl`
- All inputs: `bg-[#16161e] border border-[#22222e] rounded-md text-[#c0c0cc] placeholder-[#3a3a4a] outline-none focus:border-[#3b82f644]`
- Primary button: `bg-[#3b82f6] text-white rounded hover:bg-[#2563eb]`
- Ghost button: `text-[#5a5a6a] hover:text-[#9999aa]`
- No box shadows on cards — use subtle borders only
- All interactive elements: `transition-colors` duration default

---

## DATA MODEL

### Supabase schema — file: `supabase/schema.sql`

```sql
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
```

### Supabase Storage
- Create bucket: `task-attachments`
- Bucket policy: authenticated users who are workspace members can upload/read
- Max file size: 50MB
- Allowed MIME types: any (images, PDFs, docs, etc.)

---

## FRONTEND DATA CONSTANTS

These live in `src/data/constants.js` — they are never stored in the DB, just referenced by status/priority IDs:

```js
export const STATUSES = [
  { id: "todo",       label: "To Do",            color: "#6b7280" },
  { id: "inprogress", label: "In Progress",       color: "#3b82f6" },
  { id: "discussion", label: "Needs Discussion",  color: "#f59e0b" },
  { id: "review",     label: "In Review",         color: "#8b5cf6" },
  { id: "testing",    label: "Testing",           color: "#06b6d4" },
  { id: "blocked",    label: "Blocked",           color: "#ef4444" },
  { id: "done",       label: "Done",              color: "#10b981" },
];

export const PRIORITIES = [
  { id: "urgent", label: "Urgent", color: "#ef4444" },
  { id: "high",   label: "High",   color: "#f97316" },
  { id: "medium", label: "Medium", color: "#eab308" },
  { id: "low",    label: "Low",    color: "#6b7280" },
];

export const PRIORITY_ARROWS = { urgent: "↑↑", high: "↑", medium: "→", low: "↓" };

export const MEMBER_COLORS = {
  // Assign a deterministic color per user based on their id
  // Use this function:
  // getMemberColor(userId) => pick from palette based on hash
};

export const MEMBER_COLOR_PALETTE = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];
```

---

## FEATURE SPECIFICATIONS

### 1. AUTH — `src/components/AuthScreen.jsx`

Full-screen centered auth screen shown when no session exists.

**Layout:**
- Dark background `#0e0e10`
- Centered card `bg-[#12121a] border border-[#1e1e28] rounded-2xl p-8 w-[380px]`
- "T" logo mark (blue square, white bold T, rounded)
- App name "TaskFlow" in `text-[22px] font-semibold text-[#e0e0e8]`
- Tagline: `text-[13px] text-[#4a4a5a]` — "Task management for focused teams"
- Google sign-in button: white Google logo SVG + "Continue with Google" — `bg-white text-[#1a1a1a] rounded-lg py-2.5 px-4 font-medium text-[13px] hover:bg-gray-100`
- Footer: `text-[11px] text-[#2a2a38]` — "By signing in you agree to our terms."

**Logic:**
```js
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
});
```

After sign-in, check if user has a workspace. If not → show workspace creation modal.

### 2. WORKSPACE CREATION (first-time onboarding)

Modal shown when authenticated user has no workspace.
- Input: "Workspace name" (e.g. "Acme Inc")
- Auto-generates slug (lowercase, hyphens)
- On create: inserts workspace + adds current user as `admin` in workspace_members
- Then creates a default project "Getting Started" with emoji 📋 and one group "My Tasks" with one sample task

### 3. SIDEBAR — `src/components/Sidebar.jsx`

**Width:** 224px (collapsible to 48px icon rail)

**Sections top to bottom:**
1. **Header** — "T" logo + workspace name + collapse toggle button
2. **View switcher** — "≡ List" / "⊞ Board" pill toggle, `bg-[#16161c]`
3. **Quick nav** — "⊙ My Tasks", "◷ Activity" (ghost buttons, 12px)
4. **Section label** — "PROJECTS" (10px uppercase tracking-widest `text-[#3a3a48]`)
5. **Projects list** — each project: emoji + name + task count + expand chevron. Selected = `bg-[#1a1a22]`. Expanded shows group sub-list indented 20px.
6. **Add project** — inline input on click (Enter to confirm, Escape to cancel)
7. **Members section** — bottom, border-top. Shows avatar pile (max 3 + overflow count) + "Invite member" button

**Collapsed rail:** show only project emojis + collapse toggle at top

**Group sub-items (when project expanded):**
- 11px text, `text-[#4a4a5a]` → `text-[#8888a0]` hover
- Click to filter tasks to that group

### 4. MAIN CONTENT — `src/components/MainContent.jsx`

**Toolbar:**
- Left: project emoji + name + "X / Y tasks done" count
- Right: search input (44px wide, expands on focus), status filter select, assignee filter select, priority filter select
- All selects: same dark input style, custom chevron via CSS background-image

**Content area:** renders `<ListView />` or `<KanbanView />` based on `view` state

### 5. LIST VIEW — `src/components/ListView.jsx`

**Column headers row** (sticky top, `bg-[#0e0e12]`):
```
[4px] [expand toggle 16px] [status badge ~100px] [title flex-1] [labels auto] [due date 80px] [priority 80px] [assignee 32px] [comment count 24px]
```

**Group sections:**
- Sticky group header: `bg-[#0e0e12] z-10 border-b border-[#1a1a22]`
- Group name (12px semibold, double-click to rename inline)
- Task count badge
- Delete group button (hover-reveal, red hover)
- Collapse chevron

**Task rows:**
- Height: 36px
- `hover:bg-[#12121a]`
- Subtask rows: `bg-[#0d0d14]`, indented by `depth * 20px`
- Expand/collapse button (▸/▾) only visible when subtasks exist
- All meta fields (status, priority, assignee) are INLINE EDITABLE — click opens a dropdown positioned absolutely below the cell
- Status badge: colored pill with dot indicator
- Priority badge: colored arrow indicator + label
- Due date chip: color-coded (red if overdue, amber if within 2 days, gray otherwise)
- Label chips: compact, hover to reveal ×
- Comment count: 💬 N (only shown if > 0)

**Add task row:**
- Inline: "+ Add task" ghost button at bottom of each group
- Click reveals inline input; Enter = save (default status: todo, priority: medium); Escape = cancel

**Add group:**
- At bottom of project: `+ New group` dashed button
- Inline input → Enter to confirm

### 6. KANBAN VIEW — `src/components/KanbanView.jsx`

- One column per status (7 columns from STATUSES)
- Column width: 256px, fixed, horizontal scroll
- Column header: colored dot + status label + task count badge
- Cards: `bg-[#12121a] border border-[#1e1e28] rounded-lg p-3`
  - Priority badge (top-left, small)
  - Title (13px, wraps)
  - Labels row (if any)
  - Subtask progress "⊟ 2/4 subtasks" (if any)
  - Bottom row: due date chip + comment count + assignee avatar
- Cards are clickable → opens TaskModal
- "+" button at bottom of each column → quick-add task in that status
- Tasks are grouped across ALL groups (Kanban ignores group boundaries, shows workspace-wide by status)

### 7. TASK MODAL — `src/components/TaskModal.jsx`

Slide-in panel from the right. Width: 580px. Overlays main content (not full-screen modal). Backdrop click closes.

**Header:**
- Breadcrumb: `ProjectName › GroupName` (10px, muted)
- "Delete" button (hover red) + "✕" close button

**Properties section (grid 2-col):**

| Property   | Component                                      |
|------------|------------------------------------------------|
| Status     | Colored pill button → StatusDropdown           |
| Priority   | Arrow + label button → PriorityDropdown        |
| Assignee   | Avatar + name button → AssigneeDropdown        |
| Due date   | `<input type="date">` styled dark              |
| Labels     | Chips with × to remove + inline add input (Enter to add) |

**Title:** `text-[18px] font-semibold` — click to edit inline (textarea, blur to save)

**Description:** click to edit (textarea, blur to save) — shows italic muted placeholder if empty

**Subtasks section:**
- Header: "Subtasks" label + "X/Y done" count + "+ Add" link
- Each subtask row: colored dot (status color) + title + assignee avatar — click to open that subtask in the same modal
- Inline add: input → Enter to save

**Tabs: Comments | Activity**

*Comments tab:*
- Each comment: avatar + author name + time ago + text
- Input: avatar + textarea (⌘↵ to send) + "Comment" button

*Activity tab:*
- Reverse chronological list
- Each entry: avatar + "Name did X" + time ago
- Auto-log these actions: task created, status changed, priority changed, assignee changed, comment added

**Time ago helper:**
```js
const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
```

### 8. INVITE MODAL — `src/components/InviteModal.jsx`

Centered modal (not slide-in). `w-[440px] bg-[#10101a] border border-[#1e1e2a] rounded-2xl`

**Content:**
- Email input + role select (Admin / Member / Viewer) + "Invite" button
- On invite: inserts row into `workspace_invites` table + (in prod) triggers Supabase Edge Function to send email
- Role guide: 3-row card explaining each role
- Pending invites list (sent this session)
- Current members list: avatar + name + email + role badge

### 9. SHARED COMPONENTS — `src/components/Badges.jsx`

Export these components:

**`<StatusBadge status="inprogress" onClick={fn} small={bool} />`**
- Pill with colored dot + label
- `small` prop: smaller text + padding
- Click opens StatusDropdown

**`<PriorityBadge priority="high" onClick={fn} small={bool} />`**
- Arrow char + label, colored
- `small` prop: arrow only (no label text)

**`<Avatar memberId="u2" members={[...]} size="sm|md" />`**
- Circular avatar with initials
- Color is deterministic per user ID (hash → MEMBER_COLOR_PALETTE)
- `size="sm"` = 24px, `size="md"` = 32px
- Shows "–" if memberId is null (unassigned)

**`<LabelChip label="backend" onRemove={fn} />`**
- `bg-[#1e1e28] text-[#6a6a82] border border-[#2a2a38]`
- Optional × button if `onRemove` provided

**`<DueDateChip date="2025-08-10" />`**
- Returns null if no date
- Overdue: `color: #ef4444, bg: #2a1515`
- Within 2 days: `color: #f59e0b, bg: #2a2010`
- Normal: `color: #6a6a82, bg: #1e1e28`

**`<StatusDropdown current={id} onChange={fn} onClose={fn} />`**
- Absolute positioned, z-50
- Lists all 7 statuses with colored dot + label
- Checkmark on current

**`<PriorityDropdown current={id} onChange={fn} onClose={fn} />`**
- Same pattern for 4 priorities

**`<AssigneeDropdown current={id} members={[...]} onChange={fn} onClose={fn} />`**
- "Unassigned" option at top
- Then all members with avatar + name
- Checkmark on current

---

## SUPABASE CLIENT — `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## HOOKS

### `src/hooks/useAuth.js`
```js
// Returns: { user, profile, loading, signIn, signOut }
// signIn() calls supabase.auth.signInWithOAuth({ provider: 'google' })
// signOut() calls supabase.auth.signOut()
// Listens to onAuthStateChange, fetches profile from profiles table
// Profile is the row from public.profiles matching user.id
```

### `src/hooks/useTasks.js`
```js
// Returns: { tasks, loading, createTask, updateTask, deleteTask, addComment, addSubtask }
// Fetches tasks for the selected project (with subtasks, comments, activity, assignee profile)
// Subscribes to realtime changes on tasks table filtered by project
// All mutations optimistically update local state then sync to Supabase
// updateTask logs to activity table automatically for: status, priority, assignee changes
```

### `src/hooks/useMembers.js`
```js
// Returns: { members, loading, invite }
// Fetches all workspace_members joined with profiles
// invite(email, role) inserts into workspace_invites
```

---

## APP CONTEXT — `src/context/AppContext.jsx`

Global state shape:
```js
{
  // Auth
  user,           // Supabase auth user
  profile,        // public.profiles row
  workspace,      // current workspace

  // Navigation
  selectedProjectId,
  setSelectedProjectId,
  selectedGroupId,       // filter by group (null = all)
  setSelectedGroupId,
  activeTaskId,          // task detail panel open
  setActiveTaskId,
  openTask(id),
  closeTask(),

  // UI
  view,            // 'list' | 'kanban'
  setView,
  sidebarCollapsed,
  setSidebarCollapsed,
  showInviteModal,
  setShowInviteModal,

  // Data (from hooks)
  data,            // { projects, members, currentUser }
  setData,         // for optimistic updates (used when Supabase is wired)
}
```

---

## ROUTING

No React Router needed. Navigation is purely state-based:
- Not authenticated → `<AuthScreen />`
- Authenticated, no workspace → workspace creation modal over app skeleton
- Authenticated, has workspace → full app

---

## APP.JSX STRUCTURE

```jsx
export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <AuthScreen />;

  return (
    <AppContext.Provider value={...}>
      <div className="flex h-screen bg-[#0e0e10] text-[#c9c9ce] overflow-hidden">
        <Sidebar />
        <MainContent />
        {activeTask && <TaskModal />}
        {showInviteModal && <InviteModal />}
      </div>
    </AppContext.Provider>
  );
}
```

---

## SEED DATA (for development / demo)

When a new workspace is created, auto-insert this seed data under the hood:

**Project 1: "Product Launch" 🚀 #3b82f6**

Group "Backend":
- "Set up API rate limiting" — In Progress, High, due 2025-08-10, labels: [backend, security]
  - Subtask: "Install redis client" — Done, Medium
  - Subtask: "Write middleware" — In Progress, High
- "Database schema migration" — Needs Discussion, Urgent, due 2025-08-05, labels: [database]

Group "Frontend":
- "Redesign dashboard layout" — In Review, Medium, due 2025-08-15, labels: [design, frontend]
  - Subtask: "Figma handoff review" — Done, Low
  - Subtask: "Implement grid system" — In Review, Medium
- "Accessibility audit" — To Do, Medium, due 2025-08-20, labels: [a11y]

Group "QA & Release":
- "End-to-end test suite" — Testing, High, due 2025-08-18, labels: [testing]

**Project 2: "Internal Tools" 🔧 #8b5cf6**

Group "Automation":
- "Automate weekly standup report" — To Do, Low, no due date, labels: [automation]

---

## REALTIME SUBSCRIPTIONS

Wire up Supabase Realtime in `useTasks.js`:
```js
const channel = supabase
  .channel('tasks-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'tasks',
    filter: `group_id=in.(${groupIds.join(',')})`
  }, (payload) => {
    // handle INSERT, UPDATE, DELETE optimistically
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'comments'
  }, (payload) => {
    // append comment to correct task in state
  })
  .subscribe();

return () => supabase.removeChannel(channel);
```

---

## ENV FILE — `.env.example`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "vite": "^5.0.11"
  }
}
```

---

## EXECUTION PLAN

Build in this exact order — do not skip ahead:

1. **Scaffold** — `npm create vite@latest taskflow -- --template react`, install deps, configure Tailwind + PostCSS
2. **Constants** — `src/data/constants.js` (STATUSES, PRIORITIES, helpers)
3. **Supabase client** — `src/lib/supabase.js`
4. **Schema** — write `supabase/schema.sql` (full schema above)
5. **Badges** — `src/components/Badges.jsx` (all shared components — build and test these first, everything depends on them)
6. **AuthScreen** — `src/components/AuthScreen.jsx`
7. **useAuth hook** — `src/hooks/useAuth.js`
8. **AppContext** — `src/context/AppContext.jsx` (with seed/mock data first, Supabase wired after)
9. **Sidebar** — `src/components/Sidebar.jsx`
10. **MainContent toolbar** — `src/components/MainContent.jsx`
11. **ListView** — `src/components/ListView.jsx`
12. **KanbanView** — `src/components/KanbanView.jsx`
13. **TaskModal** — `src/components/TaskModal.jsx`
14. **InviteModal** — `src/components/InviteModal.jsx`
15. **App.jsx** — wire everything together
16. **useMembers + useTasks hooks** — replace mock data with real Supabase queries
17. **Realtime subscriptions** — add to useTasks
18. **Auth flow** — hook up Google OAuth, workspace creation
19. **File attachments** — add upload UI in TaskModal, wire to Supabase Storage
20. **Polish** — verify all hover states, transitions, scrollbars, responsive behaviour at 1280px+ width

---

## QUALITY CHECKLIST

Before considering the build complete, verify all of these:

- [ ] Google OAuth sign-in works end-to-end (redirect back to app, profile auto-created)
- [ ] New workspace creation modal works, seed data auto-inserted
- [ ] Projects + groups render in sidebar, expand/collapse works
- [ ] Tasks list renders with correct status/priority/assignee badges
- [ ] Inline status dropdown works on task row (click → dropdown → select → closes → badge updates)
- [ ] Inline priority dropdown works on task row
- [ ] Inline assignee dropdown works on task row
- [ ] Task title click opens TaskModal slide-in panel
- [ ] TaskModal: all property dropdowns work (status, priority, assignee, due date, labels)
- [ ] TaskModal: title inline edit (click → textarea → blur → saves)
- [ ] TaskModal: description inline edit
- [ ] TaskModal: add subtask → appears in list → click subtask opens modal for subtask
- [ ] TaskModal: post comment → appears with avatar + timestamp
- [ ] TaskModal: activity tab shows auto-logged changes
- [ ] TaskModal: delete task → confirms → closes modal + removes from list
- [ ] Kanban board shows all tasks in correct status columns
- [ ] Add task via kanban "+" → appears in correct column
- [ ] Add group → group appears in list + sidebar
- [ ] Rename group (double-click) works
- [ ] Delete group works (with confirmation)
- [ ] Add project → sidebar updates → project is selectable
- [ ] Filters (status, assignee, priority, search) correctly filter task rows
- [ ] Invite modal: email + role → inserts to workspace_invites
- [ ] Sidebar collapse → icon rail → expand works
- [ ] Realtime: open app in two tabs, update task in one → other updates automatically
- [ ] File upload in TaskModal → file appears in attachments list with filename + size
- [ ] Scrollbars have custom dark styling
- [ ] No console errors or warnings in production build

---

## KNOWN DECISIONS (do not re-ask)

| Question | Decision |
|----------|----------|
| Mobile support? | Desktop only (min-width: 1280px). No responsive breakpoints needed. |
| Dark/light mode toggle? | Dark only. No toggle. |
| Drag-and-drop for tasks? | Not in v1. Positional ordering via `position` int column only. |
| Notifications (email)? | Schema supports it. UI shows pending invites. Actual email sending = Supabase Edge Function, stub it out, don't block on it. |
| Multiple workspaces? | Users can belong to multiple but the app UI shows only one at a time. Workspace switcher = v2. |
| @mentions in comments? | Not in v1. Plain text comments only. |
| Markdown in description? | Not in v1. Plain text, rendered as-is with `whitespace-pre-wrap`. |
| Task templates? | Not in v1. |
| Bulk actions? | Not in v1. |
| Task relations (blocking/blocked-by)? | Not in v1. |
| Keyboard shortcuts? | Not in v1. |
| Testing? | Not required. |

---

*End of prompt. Build everything above. Ship it.*

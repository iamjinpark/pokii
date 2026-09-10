create table goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  title       text not null check (char_length(title) between 1 and 60),
  tag         text not null check (char_length(tag) between 1 and 8),
  position    smallint not null check (position between 1 and 3),
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);

-- 진행 중인 목표끼리만 자리가 겹치면 안 된다. 보관한 목표는 자리를 비워준다.
create unique index goals_active_slot on goals (user_id, position)
  where archived_at is null;
create index goals_user on goals (user_id);

create table bunches (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references goals on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  sequence    int not null check (sequence >= 1),
  started_on  date not null,
  closed_at   timestamptz,
  unique (goal_id, sequence),
  -- grapes의 복합 외래키가 참조할 대상
  unique (id, goal_id)
);

create table grapes (
  id          uuid primary key default gen_random_uuid(),
  bunch_id    uuid not null,
  goal_id     uuid not null,
  user_id     uuid not null references auth.users on delete cascade,
  grape_date  date not null,
  filled_at   timestamptz not null default now(),
  mood        text not null check (mood in ('excited','happy','calm','tired','sad')),
  note        text check (note is null or char_length(note) <= 100),
  -- 하루에 두 알이 들어갈 수 없다. 이 스키마에서 가장 중요한 제약.
  unique (goal_id, grape_date),
  -- 알이 가리키는 송이와 목표가 어긋날 수 없다.
  foreign key (bunch_id, goal_id) references bunches (id, goal_id) on delete cascade
);

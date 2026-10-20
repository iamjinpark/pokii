-- 목표 제목을 40자로 줄인다. 송이 상세에서 제목이 360 폭 화면에서도 3줄을 넘지 않게 한다 (#57).
-- 이미 40자를 넘는 제목이 있을 수 있어 not valid로 건다. 기존 행은 그대로 두고, 새로 쓰거나 고칠 때만 검사한다.
alter table goals drop constraint goals_title_check;
alter table goals add constraint goals_title_check check (char_length(title) between 1 and 40) not valid;

-- UNLOCK Lab Platform: dedicated NEW Supabase project only.
-- Requires PostgreSQL 15+, Supabase Auth, Supabase Storage.
-- Apply in a brand-new project. Never apply to the unrelated Paisa Family database.
create schema if not exists private;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(length(name) between 2 and 80),
 is_platform_admin boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 4 and 120),
 location text not null check(length(location) between 4 and 180),
 timezone text not null default 'Asia/Kolkata',
 description text not null default '',
 owner_id uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','active','rejected','suspended')),
 decision_note text,
 created_at timestamptz not null default now()
);
create table public.resources (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id),
 owner_id uuid not null references public.profiles(id),
 name text not null check(length(name) between 4 and 120),
 category text not null check(length(category) between 3 and 60),
 location text not null check(length(location) between 4 and 180),
 timezone text not null default 'Asia/Kolkata',
 description text not null default '',
 conditions text not null check(length(conditions) between 8 and 1000),
 requirements text[] not null default '{}',
 opens time not null default '09:00', closes time not null default '18:00',
 max_hours numeric not null default 3 check(max_hours>=0.5 and max_hours<=6),
 status text not null default 'active' check(status in ('active','paused','retired')),
 created_at timestamptz not null default now(),
 constraint valid_open_hours check(opens<closes)
);
create table private.resource_pins (
 resource_id uuid primary key references public.resources(id) on delete cascade,
 pin_hash text not null,
 updated_at timestamptz not null default now()
);
create table public.certifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 organization_id uuid not null references public.organizations(id),
 tag text not null check(length(tag) between 2 and 40),
 verified_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(user_id,organization_id,tag)
);
create table public.training_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 organization_id uuid not null references public.organizations(id),
 tag text not null check(length(tag) between 2 and 40),
 evidence text not null check(length(evidence) between 12 and 600),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 decision_note text,
 created_at timestamptz not null default now(),
 decided_at timestamptz
);
create table public.bookings (
 id uuid primary key default gen_random_uuid(),
 resource_id uuid not null references public.resources(id),
 user_id uuid not null references public.profiles(id),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 purpose text not null check(length(purpose) between 8 and 400),
 status text not null default 'pending' check(status in ('pending','waitlisted','approved','rejected','cancelled','active','return_pending','returned')),
 decision_note text,
 decided_by uuid references public.profiles(id),
 initial_condition text check(initial_condition in ('Excellent','Good','Worn','Damaged')),
 final_condition text check(final_condition in ('Excellent','Good','Worn','Damaged')),
 initial_note text,
 final_note text,
 checked_in_at timestamptz, checked_out_at timestamptz, returned_at timestamptz,
 created_at timestamptz not null default now(),
 constraint slot_range check(ends_at>starts_at and ends_at-starts_at<=interval '6 hours' and ends_at-starts_at>=interval '30 minutes')
);
-- Prevent double booking under concurrent approvals, not just in application code.
create extension if not exists btree_gist;
alter table public.bookings add constraint no_confirmed_resource_overlap
 exclude using gist (resource_id with =, tstzrange(starts_at,ends_at,'[)') with &&)
 where (status in ('approved','active','return_pending'));
create table public.booking_photos (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id),
 uploader_id uuid not null references public.profiles(id),
 stage text not null check(stage in ('before','after')),
 storage_path text not null unique,
 created_at timestamptz not null default now()
);
create table public.incidents (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id),
 reporter_id uuid not null references public.profiles(id),
 description text not null check(length(description) between 10 and 1000),
 status text not null default 'open' check(status in ('open','resolved')),
 resolution text,
 resolved_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
create table public.audit_events (
 id bigint generated always as identity primary key,
 actor_id uuid references public.profiles(id),
 booking_id uuid references public.bookings(id),
 resource_id uuid references public.resources(id),
 organization_id uuid references public.organizations(id),
 event_type text not null,
 message text not null,
 created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 heading text not null,
 message text not null,
 created_at timestamptz not null default now()
);
create index idx_resources_org on public.resources(organization_id);
create index idx_booking_user on public.bookings(user_id,created_at desc);
create index idx_booking_resource on public.bookings(resource_id,starts_at);
create index idx_training_org on public.training_requests(organization_id,status);
create index idx_notification_user on public.notifications(user_id,created_at desc);
create index idx_events_booking on public.audit_events(booking_id,created_at desc);

-- All public tables are read-only to clients. Mutations pass through verified RPCs.
do $$ declare t text; begin
 foreach t in array array['profiles','organizations','resources','certifications','training_requests','bookings','booking_photos','incidents','audit_events','notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;

create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and is_platform_admin=true)
$$;
create function private.is_owner(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.organizations where id=p_org and owner_id=(select auth.uid()))
$$;
create function private.can_see_booking(p_booking uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.bookings b join public.resources r on r.id=b.resource_id where b.id=p_booking and (b.user_id=(select auth.uid()) or r.owner_id=(select auth.uid()) or private.is_admin()))
$$;
create function private.is_email_verified() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid()) and email_confirmed_at is not null)
$$;
create function private.audit(p_type text,p_message text,p_booking uuid default null,p_resource uuid default null,p_org uuid default null)
 returns void language plpgsql security definer set search_path='' as $$begin
 insert into public.audit_events(actor_id,booking_id,resource_id,organization_id,event_type,message)
 values(auth.uid(),p_booking,p_resource,p_org,p_type,left(p_message,600));end$$;
create function private.notice(p_user uuid,p_heading text,p_message text)
 returns void language plpgsql security definer set search_path='' as $$begin
 insert into public.notifications(user_id,heading,message) values(p_user,left(p_heading,100),left(p_message,400));end$$;

create policy p_profile on public.profiles for select to authenticated using (
 id=(select auth.uid()) or private.is_admin() or exists(
 select 1 from public.bookings b join public.resources r on r.id=b.resource_id
 where b.user_id=profiles.id and r.owner_id=(select auth.uid())
 ));
create policy p_org on public.organizations for select to authenticated using(status='active' or owner_id=(select auth.uid()) or private.is_admin());
create policy p_resource on public.resources for select to authenticated using((status='active' and exists(select 1 from public.organizations o where o.id=resources.organization_id and o.status='active')) or owner_id=(select auth.uid()) or private.is_admin());
create policy p_cert on public.certifications for select to authenticated using(user_id=(select auth.uid()) or private.is_owner(organization_id) or private.is_admin());
create policy p_training on public.training_requests for select to authenticated using(user_id=(select auth.uid()) or private.is_owner(organization_id) or private.is_admin());
create policy p_booking on public.bookings for select to authenticated using(user_id=(select auth.uid()) or exists(select 1 from public.resources r where r.id=bookings.resource_id and r.owner_id=(select auth.uid())) or private.is_admin());
create policy p_photos on public.booking_photos for select to authenticated using(private.can_see_booking(booking_id));
create policy p_incident on public.incidents for select to authenticated using(private.can_see_booking(booking_id));
create policy p_audit on public.audit_events for select to authenticated using(actor_id=(select auth.uid()) or (booking_id is not null and private.can_see_booking(booking_id)) or (resource_id is not null and exists(select 1 from public.resources r where r.id=resource_id and r.owner_id=(select auth.uid()))) or (organization_id is not null and private.is_owner(organization_id)) or private.is_admin());
create policy p_notice on public.notifications for select to authenticated using(user_id=(select auth.uid()));

create function private.signup_profile() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.profiles(id,name) values(new.id,coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),80),''),'New member'));
 return new;
end$$;
create trigger on_unlock_signup after insert on auth.users for each row execute function private.signup_profile();

-- A verified email can apply to register an organisation. Approval is human-controlled.
create function private.create_organization(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_name text=trim(p->>'name');v_location text=trim(p->>'location');v_id uuid;
begin
 if auth.uid() is null or not private.is_email_verified() then raise exception 'Verified account required';end if;
 if length(v_name) not between 4 and 120 or length(v_location) not between 4 and 180 then raise exception 'Enter organisation name and physical location';end if;
 if (select count(*) from public.organizations where owner_id=auth.uid() and status in('pending','active'))>=3 then raise exception 'Organisation application limit reached';end if;
 if not exists(select 1 from pg_timezone_names where name=coalesce(p->>'timezone','Asia/Kolkata')) then raise exception 'Invalid IANA time zone';end if;
 insert into public.organizations(name,location,timezone,description,owner_id) values(v_name,v_location,coalesce(p->>'timezone','Asia/Kolkata'),left(coalesce(p->>'description',''),1000),auth.uid()) returning id into v_id;
 perform private.audit('organisation_application','Submitted organisation for human review',null,null,v_id);
 return 'Organisation application submitted. A platform administrator must approve it before resources go public.';
end$$;
create function private.approve_organization(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_org public.organizations%rowtype;v_decision text=p->>'decision';v_note text=trim(coalesce(p->>'note',''));
begin
 if not private.is_admin() then raise exception 'Platform administrator approval required';end if;
 select * into strict v_org from public.organizations where id=(p->>'organizationId')::uuid for update;
 if v_org.status!='pending' or v_decision not in('approve','reject') or length(v_note)<12 then raise exception 'Valid decision with explanation required';end if;
 update public.organizations set status=case when v_decision='approve' then 'active' else 'rejected' end,decision_note=v_note where id=v_org.id;
 perform private.notice(v_org.owner_id,'Organisation reviewed',v_note);
 perform private.audit('organisation_decision',v_decision||': '||v_note,null,null,v_org.id);
 return 'Organisation decision recorded.';
end$$;
create function private.create_resource(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_org public.organizations%rowtype;v_id uuid;v_pin text;v_tags text[];v_opens time;v_closes time;v_limit numeric;
begin
 select * into strict v_org from public.organizations where id=(p->>'organizationId')::uuid;
 if v_org.owner_id<>auth.uid() or v_org.status!='active' then raise exception 'Verified organisation ownership required';end if;
 v_tags=array(select distinct jsonb_array_elements_text(coalesce(p->'requirements','[]'::jsonb)) limit 10);
 if exists(select 1 from unnest(v_tags) x where length(x) not between 2 and 40 or x!~'^[a-z0-9-]+$') then raise exception 'Invalid training requirements';end if;
 v_opens=coalesce(nullif(p->>'opens','')::time,'09:00');v_closes=coalesce(nullif(p->>'closes','')::time,'18:00');v_limit=coalesce(nullif(p->>'maxHours','')::numeric,3);
 insert into public.resources(organization_id,owner_id,name,category,location,description,conditions,requirements,opens,closes,max_hours)
 values(v_org.id,auth.uid(),left(trim(p->>'name'),120),left(trim(p->>'category'),60),left(trim(p->>'location'),180),left(trim(coalesce(p->>'description','')),1500),left(trim(p->>'conditions'),1000),v_tags,v_opens,v_closes,v_limit)
 returning id into v_id;
 v_pin=upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 12));
 insert into private.resource_pins(resource_id,pin_hash) values(v_id,encode(sha256(convert_to(v_pin||v_id::text,'UTF8')),'hex'));
 perform private.audit('resource_created','Resource listed: '||(p->>'name'),null,v_id,v_org.id);
 return 'Resource published. Handover PIN (displayed once): '||v_pin;
end$$;
create function private.rotate_resource_pin(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_id uuid=(p->>'resourceId')::uuid;v_pin text;
begin
 if not exists(select 1 from public.resources where id=v_id and owner_id=auth.uid()) then raise exception 'Resource owner required';end if;
 v_pin=upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 12));
 update private.resource_pins set pin_hash=encode(sha256(convert_to(v_pin||v_id::text,'UTF8')),'hex'),updated_at=now() where resource_id=v_id;
 perform private.audit('pin_rotated','Resource handover PIN rotated',null,v_id);
 return 'New PIN (displayed once): '||v_pin;
end$$;
create function private.request_training(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_org public.organizations%rowtype;v_tag text=trim(p->>'tag');v_evidence text=trim(p->>'evidence');
begin
 select * into strict v_org from public.organizations where id=(p->>'organizationId')::uuid;
 if v_org.status!='active' or auth.uid()=v_org.owner_id then raise exception 'Training requests are for other verified members';end if;
 if length(v_tag) not between 2 and 40 or length(v_evidence) not between 12 and 600 then raise exception 'Provide a training tag and supporting details';end if;
 if exists(select 1 from public.certifications where user_id=auth.uid() and organization_id=v_org.id and tag=v_tag) then raise exception 'Already certified';end if;
 if exists(select 1 from public.training_requests where user_id=auth.uid() and organization_id=v_org.id and tag=v_tag and status='pending') then raise exception 'Request already pending';end if;
 insert into public.training_requests(user_id,organization_id,tag,evidence) values(auth.uid(),v_org.id,v_tag,v_evidence);
 perform private.notice(v_org.owner_id,'Training review requested','A learner submitted training evidence for '||v_tag);
 perform private.audit('training_requested','Training verification requested for '||v_tag,null,null,v_org.id);
 return 'Training evidence sent for human review.';
end$$;
create function private.review_training(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_t public.training_requests%rowtype;v_decision text=p->>'decision';v_note text=trim(coalesce(p->>'note',''));
begin
 select * into strict v_t from public.training_requests where id=(p->>'requestId')::uuid for update;
 if not private.is_owner(v_t.organization_id) and not private.is_admin() then raise exception 'Institutional reviewer required';end if;
 if v_t.status!='pending' or v_decision not in('approve','reject') or length(v_note)<10 then raise exception 'Decision with explanation required';end if;
 update public.training_requests set status=case when v_decision='approve' then 'approved' else 'rejected' end,decision_note=v_note,decided_at=now() where id=v_t.id;
 if v_decision='approve' then insert into public.certifications(user_id,organization_id,tag,verified_by) values(v_t.user_id,v_t.organization_id,v_t.tag,auth.uid()) on conflict do nothing;end if;
 perform private.notice(v_t.user_id,'Training decision',v_decision||': '||v_note);
 perform private.audit('training_decision',v_decision||' for '||v_t.tag,null,null,v_t.organization_id);
 return 'Training decision saved.';
end$$;
create function private.create_booking(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_r public.resources%rowtype;v_start timestamptz;v_end timestamptz;v_purpose text=trim(p->>'purpose');v_status text;v_id uuid;v_usage numeric;v_timezone text;
begin
 if auth.uid() is null or not private.is_email_verified() then raise exception 'Verified email required';end if;
 select * into strict v_r from public.resources where id=(p->>'resourceId')::uuid;
 perform 1 from public.resources where id=v_r.id for update; -- serialise competing new requests
 if v_r.owner_id=auth.uid() or v_r.status!='active' or not exists(select 1 from public.organizations where id=v_r.organization_id and status='active') then raise exception 'This resource is not open for booking';end if;
 select timezone into v_timezone from public.organizations where id=v_r.organization_id;
 v_start=(p->>'start')::timestamptz;v_end=(p->>'end')::timestamptz;
 if v_start<now() or v_start>now()+interval '60 days' or v_end-v_start<interval '30 minutes' or v_end-v_start>v_r.max_hours*interval '1 hour' then raise exception 'Choose a valid future session within the resource limit';end if;
 if ((v_start at time zone v_timezone)::time < v_r.opens or (v_end at time zone v_timezone)::time > v_r.closes or (v_start at time zone v_timezone)::date<>(v_end at time zone v_timezone)::date) then raise exception 'Outside the resource local availability window';end if;
 if length(v_purpose) not between 8 and 400 then raise exception 'Purpose must contain 8–400 characters';end if;
 if exists(select 1 from unnest(v_r.requirements) as tag where not exists(select 1 from public.certifications c where c.user_id=auth.uid() and c.organization_id=v_r.organization_id and c.tag=tag)) then raise exception 'Training certification needed before booking';end if;
 if (select count(*) from public.bookings where user_id=auth.uid() and resource_id=v_r.id and status in('pending','waitlisted','approved','active','return_pending'))>=2 then raise exception 'Fair-use limit: maximum two open requests per resource';end if;
 select coalesce(sum(extract(epoch from ends_at-starts_at)/3600),0) into v_usage from public.bookings where user_id=auth.uid() and resource_id=v_r.id and starts_at>=v_start-interval '7 days' and starts_at<=v_start and status in('approved','active','return_pending','returned');
 if v_usage+extract(epoch from v_end-v_start)/3600>6 then raise exception 'Fair-use limit: six hours per resource in rolling seven days';end if;
 if exists(select 1 from public.bookings where user_id=auth.uid() and resource_id=v_r.id and status in('pending','waitlisted','approved','active','return_pending') and starts_at<v_end and v_start<ends_at) then raise exception 'You already have an overlapping request';end if;
 v_status=case when exists(select 1 from public.bookings where resource_id=v_r.id and status in('approved','active','return_pending') and starts_at<v_end and v_start<ends_at) then 'waitlisted' else 'pending' end;
 insert into public.bookings(resource_id,user_id,starts_at,ends_at,purpose,status) values(v_r.id,auth.uid(),v_start,v_end,v_purpose,v_status) returning id into v_id;
 perform private.notice(v_r.owner_id,'New booking request','New request for '||v_r.name);
 perform private.audit('booking_requested','Booking '||v_status||' with eligibility checked',v_id,v_r.id);
 return 'Booking '||v_status||'. The institution will review your request.';
end$$;
create function private.decide_booking(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_r public.resources%rowtype;v_decision text=p->>'decision';v_note text=trim(coalesce(p->>'note',''));v_usage numeric;v_comp numeric;
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid for update;
 select * into strict v_r from public.resources where id=v_b.resource_id for update;
 if v_r.owner_id<>auth.uid() and not private.is_admin() then raise exception 'Only authorised owner may decide';end if;
 if v_b.status not in('pending','waitlisted') or v_decision not in('approve','reject','waitlist') then raise exception 'Booking is not reviewable';end if;
 if length(v_note)<10 then raise exception 'Explain the decision in at least ten characters';end if;
 if v_decision='approve' then
  if v_r.status!='active' or not exists(select 1 from public.organizations where id=v_r.organization_id and status='active') then raise exception 'Institution or resource is no longer active';end if;
  if v_b.starts_at<now() then raise exception 'Cannot approve an expired session';end if;
  if exists(select 1 from unnest(v_r.requirements) tag where not exists(select 1 from public.certifications c where c.user_id=v_b.user_id and c.organization_id=v_r.organization_id and c.tag=tag)) then raise exception 'Borrower training is no longer valid';end if;
  if exists(select 1 from public.bookings x where x.id<>v_b.id and x.resource_id=v_r.id and x.status in('approved','active','return_pending') and x.starts_at<v_b.ends_at and v_b.starts_at<x.ends_at) then raise exception 'Scheduling conflict: slot already confirmed';end if;
  select coalesce(sum(extract(epoch from b.ends_at-b.starts_at)/3600),0) into v_usage from public.bookings b where b.user_id=v_b.user_id and b.resource_id=v_r.id and b.starts_at>=now()-interval '30 days' and b.status in('approved','active','return_pending','returned');
  select min(coalesce((select sum(extract(epoch from z.ends_at-z.starts_at)/3600) from public.bookings z where z.user_id=x.user_id and z.resource_id=v_r.id and z.starts_at>=now()-interval '30 days' and z.status in('approved','active','return_pending','returned')),0)) into v_comp
  from public.bookings x where x.id<>v_b.id and x.resource_id=v_r.id and x.status in('pending','waitlisted') and x.starts_at<v_b.ends_at and v_b.starts_at<x.ends_at;
  if v_comp is not null and v_usage>v_comp and coalesce(p->>'override','false')<>'true' then raise exception 'FairQueue: lower-usage eligible applicant has priority; use documented override only if justified';end if;
  update public.bookings set status='approved',decision_note=v_note,decided_by=auth.uid() where id=v_b.id;
  update public.bookings set status='waitlisted',decision_note='Approved competing booking; retained on fair waiting list' where resource_id=v_r.id and id<>v_b.id and status='pending' and starts_at<v_b.ends_at and v_b.starts_at<ends_at;
 elsif v_decision='reject' then update public.bookings set status='rejected',decision_note=v_note,decided_by=auth.uid() where id=v_b.id;
 else update public.bookings set status='waitlisted',decision_note=v_note,decided_by=auth.uid() where id=v_b.id;
 end if;
 perform private.notice(v_b.user_id,'Booking decision',v_decision||': '||v_note);
 perform private.audit('booking_decision',v_decision||': '||v_note,v_b.id,v_r.id);
 return 'Booking decision recorded and communicated.';
end$$;
create function private.cancel_booking(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_r public.resources%rowtype;v_candidate uuid;
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid for update;
 select * into strict v_r from public.resources where id=v_b.resource_id for update;
 if v_b.user_id<>auth.uid() and v_r.owner_id<>auth.uid() then raise exception 'Not authorised to cancel';end if;
 if v_b.status not in('pending','waitlisted','approved') then raise exception 'Cannot cancel after check-in';end if;
 update public.bookings set status='cancelled',decision_note=left(coalesce(p->>'note','Cancelled'),300) where id=v_b.id;
 if v_b.status='approved' then
  select x.id into v_candidate from public.bookings x where x.resource_id=v_r.id and x.status='waitlisted' and x.starts_at<v_b.ends_at and v_b.starts_at<x.ends_at
  order by x.created_at asc limit 1;
  if v_candidate is not null then update public.bookings set status='pending',decision_note='Slot reopened; pending owner review' where id=v_candidate;
   perform private.notice((select user_id from public.bookings where id=v_candidate),'Waitlist update','A slot opened and your request now awaits owner review');end if;
 end if;
 perform private.notice(v_b.user_id,'Booking cancelled','The booking was cancelled');perform private.audit('booking_cancelled','Booking cancelled',v_b.id,v_r.id);
 return 'Booking cancelled. Waitlist updated when applicable.';
end$$;
create function private.checkin_booking(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_r public.resources%rowtype;v_hash text;v_condition text=p->>'condition';
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid for update;
 select * into strict v_r from public.resources where id=v_b.resource_id;
 if v_b.user_id<>auth.uid() or v_b.status!='approved' then raise exception 'Approved borrower only';end if;
 if now()<v_b.starts_at-interval '30 minutes' or now()>v_b.ends_at then raise exception 'Handover outside approved booking time';end if;
 if v_condition not in('Excellent','Good','Worn','Damaged') then raise exception 'Record initial condition';end if;
 select pin_hash into v_hash from private.resource_pins where resource_id=v_r.id;
 if v_hash is null or v_hash<>encode(sha256(convert_to(upper(trim(coalesce(p->>'pin','')))||v_r.id::text,'UTF8')),'hex') then raise exception 'Invalid owner handover PIN';end if;
 update public.bookings set status='active',initial_condition=v_condition,initial_note=left(coalesce(p->>'note',''),600),checked_in_at=now() where id=v_b.id;
 perform private.notice(v_r.owner_id,'Equipment checked out','Resource '||v_r.name||' checked out by approved borrower');perform private.audit('checkin','Initial condition: '||v_condition,v_b.id,v_r.id);
 return 'Checked in. Custody and condition recorded.';
end$$;
create function private.checkout_booking(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_r public.resources%rowtype;v_condition text=p->>'condition';v_note text=left(coalesce(p->>'note',''),600);
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid for update;
 if v_b.user_id<>auth.uid() or v_b.status!='active' then raise exception 'Only active borrower can return';end if;
 if v_condition not in('Excellent','Good','Worn','Damaged') then raise exception 'Final condition required';end if;
 select * into strict v_r from public.resources where id=v_b.resource_id;
 update public.bookings set status='return_pending',final_condition=v_condition,final_note=v_note,checked_out_at=now() where id=v_b.id;
 if v_condition='Damaged' then insert into public.incidents(booking_id,reporter_id,description) values(v_b.id,auth.uid(),'Damage declared on return. '||v_note);end if;
 perform private.notice(v_r.owner_id,'Return verification required',v_r.name||' has been returned; inspect and confirm');perform private.audit('return_submitted','Final condition: '||v_condition,v_b.id,v_r.id);
 return 'Return submitted; owner verification required.';
end$$;
create function private.confirm_return(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_r public.resources%rowtype;
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid for update;
 select * into strict v_r from public.resources where id=v_b.resource_id;
 if v_r.owner_id<>auth.uid() and not private.is_admin() then raise exception 'Authorised owner required';end if;
 if v_b.status!='return_pending' then raise exception 'Return has not been submitted';end if;
 update public.bookings set status='returned',returned_at=now() where id=v_b.id;
 perform private.notice(v_b.user_id,'Return confirmed','Owner acknowledged the return');perform private.audit('return_confirmed','Owner confirmed return and condition',v_b.id,v_r.id);
 return 'Return confirmed; audit record saved.';
end$$;
create function private.report_incident(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_r public.resources%rowtype;v_details text=trim(coalesce(p->>'description',''));
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid;
 select * into strict v_r from public.resources where id=v_b.resource_id;
 if v_b.user_id<>auth.uid() and v_r.owner_id<>auth.uid() then raise exception 'Booking participant required';end if;
 if length(v_details) not between 10 and 1000 then raise exception 'Describe incident in 10–1000 characters';end if;
 insert into public.incidents(booking_id,reporter_id,description) values(v_b.id,auth.uid(),v_details);
 perform private.notice(v_r.owner_id,'Incident reported','An incident requires human review');perform private.audit('incident_reported','Incident opened for human review',v_b.id,v_r.id);
 return 'Incident submitted; no automatic penalty has been applied.';
end$$;
create function private.resolve_incident(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_i public.incidents%rowtype;v_r public.resources%rowtype;v_note text=trim(coalesce(p->>'resolution',''));
begin
 select * into strict v_i from public.incidents where id=(p->>'incidentId')::uuid for update;
 select r.* into strict v_r from public.bookings b join public.resources r on r.id=b.resource_id where b.id=v_i.booking_id;
 if v_r.owner_id<>auth.uid() and not private.is_admin() then raise exception 'Authorised reviewer required';end if;
 if v_i.status!='open' or length(v_note)<12 then raise exception 'Human resolution explanation required';end if;
 update public.incidents set status='resolved',resolution=v_note,resolved_by=auth.uid(),resolved_at=now() where id=v_i.id;
 perform private.audit('incident_resolved','Human review: '||left(v_note,250),v_i.booking_id,v_r.id);
 return 'Incident resolution recorded.';
end$$;
create function private.attach_booking_photo(p jsonb) returns text language plpgsql security definer set search_path='' as $$
declare v_b public.bookings%rowtype;v_stage text=p->>'stage';v_path text=p->>'path';
begin
 select * into strict v_b from public.bookings where id=(p->>'bookingId')::uuid for update;
 if v_b.user_id<>auth.uid() or v_stage not in('before','after') then raise exception 'Only borrower can attach evidence';end if;
 if (v_stage='before' and v_b.status not in('approved','active')) or (v_stage='after' and v_b.status not in('active','return_pending')) then raise exception 'Photo stage does not match booking state';end if;
 if v_path not like v_b.id::text||'/'||auth.uid()::text||'/'||v_stage||'-%' or length(v_path)>250 then raise exception 'Invalid evidence path';end if;
 if not exists(select 1 from storage.objects where bucket_id='condition-evidence' and name=v_path) then raise exception 'Photo upload is missing';end if;
 insert into public.booking_photos(booking_id,uploader_id,stage,storage_path) values(v_b.id,auth.uid(),v_stage,v_path);
 perform private.audit('photo_uploaded','Private condition photo ('||v_stage||') added',v_b.id,v_b.resource_id);
 return 'Condition photo attached.';
end$$;

-- API wrappers are INVOKER (not definer). Privilege is behind limited private functions.
do $$ declare f text; begin
 foreach f in array array['create_organization','approve_organization','create_resource','rotate_resource_pin','request_training','review_training','create_booking','decide_booking','cancel_booking','checkin_booking','checkout_booking','confirm_return','report_incident','resolve_incident','attach_booking_photo'] loop
  execute format('create function public.%I(p_input jsonb) returns text language sql security invoker set search_path='''' as $body$ select private.%I(p_input) $body$',f,f);
  execute format('revoke execute on function public.%I(jsonb) from public,anon',f);
  execute format('grant execute on function public.%I(jsonb) to authenticated',f);
  execute format('revoke execute on function private.%I(jsonb) from public,anon',f);
  execute format('grant execute on function private.%I(jsonb) to authenticated',f);
 end loop;
end $$;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
revoke execute on function private.is_admin() from public,anon;
revoke execute on function private.is_owner(uuid) from public,anon;
revoke execute on function private.can_see_booking(uuid) from public,anon;
revoke execute on function private.is_email_verified() from public,anon;
revoke execute on function private.audit(text,text,uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function private.notice(uuid,text,text) from public,anon,authenticated;
revoke execute on function private.signup_profile() from public,anon,authenticated;

-- Storage: private evidence bucket. Read access only to booking participants;
-- upload path fixed to booking UUID / authenticated user's UUID / before|after-UUID.ext.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('condition-evidence','condition-evidence',false,3145728,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy "members upload their own booking evidence" on storage.objects for insert to authenticated with check(
 bucket_id='condition-evidence' and
 split_part(name,'/',2)=(select auth.uid())::text and
 private.can_see_booking(nullif(split_part(name,'/',1),'')::uuid) and
 exists(select 1 from public.bookings b where b.id=nullif(split_part(name,'/',1),'')::uuid and b.user_id=(select auth.uid()) and b.status in('approved','active','return_pending'))
);
create policy "booking participants read evidence" on storage.objects for select to authenticated using(
 bucket_id='condition-evidence' and private.can_see_booking(nullif(split_part(name,'/',1),'')::uuid)
);
-- Manual operator bootstrapping AFTER signing up with the email to be platform admin:
-- update public.profiles set is_platform_admin=true where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL' limit 1);
-- Production policy: the admin must verify institutional ownership outside the platform before approval.
-- Allow read-only public discovery; no member or private booking information exposed.
grant select on public.organizations,public.resources to anon;
create policy p_org_public on public.organizations for select to anon using(status='active');
create policy p_resource_public on public.resources for select to anon using(status='active' and exists(select 1 from public.organizations o where o.id=resources.organization_id and o.status='active'));

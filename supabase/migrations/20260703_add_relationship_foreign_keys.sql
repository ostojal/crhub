-- Add foreign keys so PostgREST (Supabase's API layer) can resolve
-- nested/embedded selects like contacts(*, contact_status(...)).

alter table public.contact_status
  add constraint contact_status_contact_id_fkey
  foreign key (contact_id) references public.contacts (id)
  on delete cascade;

alter table public.interactions
  add constraint interactions_contact_id_fkey
  foreign key (contact_id) references public.contacts (id)
  on delete cascade;

alter table public.interactions
  add constraint interactions_user_id_fkey
  foreign key (user_id) references public.users (id)
  on delete set null;

alter table public.assignments
  add constraint assignments_contact_id_fkey
  foreign key (contact_id) references public.contacts (id)
  on delete cascade;

alter table public.assignments
  add constraint assignments_user_id_fkey
  foreign key (user_id) references public.users (id)
  on delete cascade;

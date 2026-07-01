-- Private bucket for label / case photos and import files.
-- Each user's objects live under a top-level folder named their user id.

insert into storage.buckets (id, name, public)
values ('labels', 'labels', false)
on conflict (id) do nothing;

create policy "own label objects — read" on storage.objects
  for select to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own label objects — insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own label objects — update" on storage.objects
  for update to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own label objects — delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'labels' and (storage.foldername(name))[1] = auth.uid()::text);

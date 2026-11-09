-- New functions are runnable by everyone by default. The pastoral functions from 20261106 are for
-- signed-in members and carers only, so take them away from logged-out visitors.
revoke execute on function public.pastoral_carers_available(uuid), public.carer_requests() from public, anon;
grant execute on function public.pastoral_carers_available(uuid), public.carer_requests() to authenticated;

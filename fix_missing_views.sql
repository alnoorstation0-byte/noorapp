CREATE OR REPLACE VIEW public.vw_unread_counts AS
SELECT
  p.id AS user_id,
  (SELECT count(*) FROM public.messages m WHERE m.receiver_id = p.id AND (m.is_read = false OR m.is_read IS NULL)) AS unread_messages,
  (SELECT count(*) FROM public.notifications n WHERE n.user_id = p.id AND (n.is_read = false OR n.is_read IS NULL)) AS unread_notifications
FROM public.profiles p;

INSERT INTO public.profiles (id, username, role, full_name, quick_links)
SELECT id, email, 'super_admin', COALESCE(raw_user_meta_data->>'full_name', email), '[]'::jsonb
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

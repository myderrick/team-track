create or replace function app.send_email_direct(
  p_to text,
  p_subject text,
  p_message text,
  p_outbox_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_url text := 'https://tsozuhhxezbtrtncgbpl.supabase.co/functions/v1/email-worker';
  v_secret text;
  v_anon_key text;
  v_resp jsonb;
  v_status text;
  v_status_code int;
  v_request_id text;
  v_ok boolean;
  v_error text;
begin
  if coalesce(nullif(trim(p_to), ''), '') = '' then
    return jsonb_build_object('ok', false, 'status', 400, 'error', 'Missing recipient email');
  end if;

  begin
    v_secret := trim(both '"' from trim(both from coalesce(app.get_secret('nudge_secret'), '')));
    v_anon_key := trim(both '"' from trim(both from coalesce(app.get_secret('supabase_anon_key'), '')));
  exception when undefined_function then
    v_secret := trim(both '"' from trim(both from coalesce(current_setting('app.nudge_secret', true), '')));
    v_anon_key := trim(both '"' from trim(both from coalesce(current_setting('app.supabase_anon_key', true), '')));
  end;

  if v_secret = '' then
    v_secret := 'super-long-random-secret';
  end if;

  select net.http_post(
    v_url,
    jsonb_build_object(
      'to', trim(p_to),
      'subject', coalesce(nullif(trim(p_subject), ''), 'Team Track notification'),
      'message', coalesce(p_message, ''),
      'secret', v_secret
    ),
    '{}'::jsonb,
    jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || coalesce(v_anon_key, ''),
      'x-nudge-secret', v_secret
    ),
    15000
  ) into v_resp;

  v_status := coalesce(v_resp->>'status', '');
  v_status_code := nullif(v_resp->>'status_code', '')::int;
  v_request_id := case when jsonb_typeof(v_resp) = 'number' then trim(both '"' from v_resp::text) else null end;
  v_ok := v_status = '200 OK'
    or coalesce(v_status_code, 0) between 200 and 299
    or v_request_id is not null;
  v_error := case when v_ok then null else coalesce(v_resp::text, 'Email worker returned a non-success response') end;

  if p_outbox_id is not null then
    update app.email_outbox
    set
      status = case when v_ok then 'sent' else 'error' end,
      sent_at = case when v_ok then now() else sent_at end,
      error = v_error,
      last_error = v_error,
      provider_message_id = coalesce(
        v_resp->>'provider_message_id',
        v_resp->>'message_id',
        v_resp->>'id',
        v_request_id,
        provider_message_id
      )
    where id = p_outbox_id;
  end if;

  return jsonb_build_object(
    'ok', v_ok,
    'status', case when v_request_id is not null then 'accepted' else v_status end,
    'status_code', v_status_code,
    'request_id', v_request_id,
    'raw', v_resp,
    'error', v_error
  );
exception
  when others then
    if p_outbox_id is not null then
      update app.email_outbox
      set
        status = 'error',
        error = sqlerrm,
        last_error = sqlerrm
      where id = p_outbox_id;
    end if;

    return jsonb_build_object('ok', false, 'status', 500, 'error', sqlerrm);
end;
$$;

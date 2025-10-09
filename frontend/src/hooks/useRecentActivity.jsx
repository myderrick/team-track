// src/hooks/useRecentActivity.js
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useRecentActivity({ orgId, limit = 20 }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setError('');

        // 1) Pull recent activity rows
        const { data: rows, error: e1 } = await supabase
          .schema('app')
          .from('activity_log')
          .select('id, action, entity_type, entity_id, details, occurred_at, actor_user_id, organization_id')
          .eq('organization_id', orgId)
          .order('occurred_at', { ascending: false })
          .limit(limit);
        if (e1) throw e1;

        // 2) Resolve actor names
        const actorIds = Array.from(new Set(rows.map(r => r.actor_user_id).filter(Boolean)));
        let userMap = {};
        if (actorIds.length) {
          const { data: users, error: e2 } = await supabase
            .schema('app')
            .from('users')
            .select('id, full_name')
            .in('id', actorIds);
          if (!e2 && users) users.forEach(u => (userMap[u.id] = u.full_name || ''));
        }

        // 3) Map to UI model
        const mapped = rows.map(r => mapActivityRow(r, userMap));
        if (!cancel) setActivities(mapped);
      } catch (err) {
        if (!cancel) setError(err.message || 'Failed to load activity');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [orgId, limit]);

  return { activities, loading, error };
}

// ---- Mapper tuned to your schema ----
function mapActivityRow(row, userMap) {
  const action = (row.action || '').toLowerCase();

  // Try to derive a nice target title from details first
  const d = row.details || {};
  const targetTitle =
    d.goal_label ||
    d.achievement_name ||
    d.key_result_title ||
    d.objective_title ||
    d.target_label ||
    `${row.entity_type} ${String(row.entity_id).slice(0, 8)}…`;

  // Normalize known actions -> UI types
  let type = 'activity';
  if (action.includes('goal_completed')) type = 'goal_completed';
  else if (action.includes('new_goal_created') || action === 'goal_created') type = 'new_goal_created';
  else if (action.includes('achievement')) type = 'achievement_unlocked';
  // Leave 'activity' for anything else

  return {
    id: row.id,
    type,
    actorName: userMap?.[row.actor_user_id] || d.actor_name || 'Someone',
    targetTitle,
    timestampISO: row.occurred_at,
  };
}

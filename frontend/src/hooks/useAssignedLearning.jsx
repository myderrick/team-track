// src/hooks/useAssignedLearning.js
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

/** Pulls assignments for a given user (subject or reviewer). */
export function useAssignedLearning({ orgId, userId }) {
  const [items, setItems] = useState([]); // { title, status, due }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setError('');

        const { data, error: e } = await supabase
          .schema('app')
          .from('review_assignments')
          .select('id, template_id, due_at, status, template:review_templates(name)')
          .eq('organization_id', orgId)
          .or(`subject_user_id.eq.${userId},reviewer_user_id.eq.${userId}`)
          .order('due_at', { ascending: true });
        if (e) throw e;

        const mapped = (data || []).map(r => ({
          id: r.id,
          title: r.template?.name || 'Review',
          status: normalizeStatus(r.status),
          due: r.due_at ? r.due_at.slice(0, 10) : null,
        }));
        if (!cancel) setItems(mapped);
      } catch (err) {
        if (!cancel) setError(err.message || 'Failed to load learning');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [orgId, userId]);

  return { items, loading, error };
}

function normalizeStatus(s='draft') {
  // Map to 'Completed' | 'In Progress' | 'Not Started'
  const v = s.toLowerCase();
  if (['completed'].includes(v)) return 'Completed';
  if (['submitted','in_review','overdue'].includes(v)) return 'In Progress';
  return 'Not Started';
}

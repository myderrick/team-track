import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const OrgCtx = createContext(null);

// Helper to normalize the RPC output into a consistent shape
function normalizeUserOrgRows(rows = []) {
  return rows.map((r) => ({
    id: r.id || r.organization_id,               // tolerate either field
    name: r.name || r.org_name || r.organization_name,
    country: r.country || r.org_country || null,
    role: (r.role || '').toLowerCase(),          // 'owner' | 'admin' | 'manager' | 'staff' | 'member'
    is_active: r.is_active !== false,            // default true if absent
  })).filter(o => o.id);
}

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]); // [{id, name, country, role, is_active}]
  const [orgId, setOrgId] = useState(() => localStorage.getItem('tt_org') || '');
  const [locations, setLocations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const [myEmployeeId, setMyEmployeeId] = useState(null);
  // Load org + role list on mount
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { setLoading(false); return; }

      // Pull from public.user_orgs (or switch to .schema('app') if that’s where it lives)
      let res = await supabase.schema('public').rpc('user_orgs');
      if (res.error) {
        console.warn('[OrgProvider] user_orgs error (public), trying app:', res.error);
        res = await supabase.schema('app').rpc('user_orgs');
      }
      if (res.error) {
        console.error('[OrgProvider] user_orgs failed:', res.error);
        setLoading(false);
        return;
      }

      const normalized = normalizeUserOrgRows(res.data || []);
      setOrgs(normalized);

      // pick saved org or default to first active
      let chosen = orgId;
      if (!chosen || !normalized.some(x => x.id === chosen)) {
        const firstActive = normalized.find(x => x.is_active) || normalized[0];
        chosen = firstActive?.id || '';
        if (chosen) localStorage.setItem('tt_org', chosen);
      }
      setOrgId(chosen);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When org changes, load org-scoped metadata
  useEffect(() => {
    (async () => {
      if (!orgId) { setLocations([]); setDepartments([]); setEmployeeCount(0); return; }
      const [locsRes, deptsRes, countRes] = await Promise.all([
        supabase.schema('public').rpc('org_locations',   { p_org_id: orgId }),
        supabase.schema('public').rpc('org_departments', { p_org_id: orgId }),
        supabase.schema('public').rpc('employee_count',  { p_org_id: orgId }),
      ]);
      setLocations(locsRes.data || []);
      setDepartments((deptsRes.data || []).map(d => d.department).filter(Boolean));
      setEmployeeCount(typeof countRes.data === 'number' ? countRes.data : 0);
    })();
  }, [orgId]);


 // Fetch *my* employee row for the current org (to know my employee_id)
  useEffect(() => {
    (async () => {
      setMyEmployeeId(null);
      if (!orgId) return;
      // Try a helper RPC that returns the current user's employee row(s)
      // If you have it only in app schema, call app; otherwise try public then app.
     let r = await supabase.rpc('employee_my', { p_org_id: orgId });
if (r.error) r = await supabase.schema('app').rpc('employee_my', { p_org_id: orgId });
setMyEmployeeId(r.data?.id ?? null);
      if (!r.error) {
        const rows = Array.isArray(r.data) ? r.data : [];
        // If user has multiple employee rows, pick the one for the selected org
        const mine = rows.find(e => e.organization_id === orgId) || rows[0];
        setMyEmployeeId(mine?.id || null);
     }
    })();
  }, [orgId]);

  function selectOrg(id) {
    setOrgId(id);
    localStorage.setItem('tt_org', id || '');
  }

  const currentOrg = useMemo(() => orgs.find(o => o.id === orgId) || null, [orgs, orgId]);

  // 🔑 Role info for the currently selected org
  const myActiveRole = useMemo(() => (currentOrg?.role || '').toLowerCase(), [currentOrg]);
  const isPrivileged = myActiveRole === 'owner' || myActiveRole === 'admin' || myActiveRole === 'manager';

  const value = useMemo(() => ({
    // existing values
    orgs,
    orgId,
    selectOrg,
    locations,
    departments,
    employeeCount,
    loading,
    currentOrg,
    // new role-facing values
    myActiveRole,
    isPrivileged,
    myEmployeeId
  }), [orgs, orgId, locations, departments, employeeCount, loading, currentOrg, myActiveRole, isPrivileged, myEmployeeId]);

  return <OrgCtx.Provider value={value}>{children}</OrgCtx.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}

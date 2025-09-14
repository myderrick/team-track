import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const OrgCtx = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);              // [{id, name, country}]
  const [orgId, setOrgId] = useState(() => localStorage.getItem('tt_org') || '');
  const [locations, setLocations] = useState([]);    // [{id, name, country, region, city}]
  const [departments, setDepartments] = useState([]);// [string]
  const [employeeCount, setEmployeeCount] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load orgs on mount (after we have a session)
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { setLoading(false); return; }

      const { data: o, error } = await supabase.schema('public').rpc('user_orgs');
      if (error) { console.error(error); setLoading(false); return; }

      setOrgs(o || []);
      // pick saved org or default to first
      let chosen = orgId;
      if (!chosen || !o?.some(x => x.id === chosen)) {
        chosen = o?.[0]?.id || '';
        if (chosen) localStorage.setItem('tt_org', chosen);
      }
      setOrgId(chosen);
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  // When org changes, load locations, departments, count
  useEffect(() => {
    (async () => {
      if (!orgId) { setLocations([]); setDepartments([]); setEmployeeCount(0); return; }
      const [{ data: locs }, { data: depts }, { data: count }] = await Promise.all([
        supabase.schema('public').rpc('org_locations', { p_org_id: orgId }),
        supabase.schema('public').rpc('org_departments', { p_org_id: orgId }),
        supabase.schema('public').rpc('employee_count', { p_org_id: orgId }),
      ]);
      setLocations(locs || []);
      setDepartments((depts || []).map(d => d.department).filter(Boolean));
      setEmployeeCount(typeof count === 'number' ? count : 0);
    })();
  }, [orgId]);

  function selectOrg(id) {
    setOrgId(id);
    localStorage.setItem('tt_org', id || '');
  }


  const currentOrg = useMemo(() => orgs.find(o => o.id === orgId) || null, [orgs, orgId]);
  const value = useMemo(() => ({
    orgs,
    orgId,
    selectOrg,
    locations,
    departments,
    employeeCount,
    loading,
    currentOrg

  }), [orgs, orgId, locations, departments, employeeCount, loading]);

  return <OrgCtx.Provider value={value}>{children}</OrgCtx.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgCtx);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}

import React from 'react';
import { useOrg } from '@/context/OrgContext';

export default function OrgSwitcher() {
  const { orgs, orgId, selectOrg, loading } = useOrg();

  if (loading) return <div className="text-sm text-gray-500">Loading orgs…</div>;
  if (!orgs || orgs.length === 0) return null;

  return (
    <select
      value={orgId}
      onChange={(e) => selectOrg(e.target.value)}
      className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none"
    >
      {orgs.map(o => (
        <option key={o.id} value={o.id}>
          {o.name} {o.country ? `(${o.country})` : ''}
        </option>
      ))}
    </select>
  );
}

import React from 'react';
import { TrendingUp, AlertTriangle, Users, Target } from 'lucide-react';

/** Small chip that adapts to theme using currentColor + .tint */
function IconChip({ icon: Icon, color }) {
  return (
    <div className="p-2 rounded-xl tint" style={{ color }}>
      <Icon className="w-5 h-5" />
    </div>
  );
}

function StatCard({ icon, label, value, sub, iconColor }) {
  return (
    <div className="card p-4 backdrop-blur-sm transition-colors">
      <div className="flex items-center gap-3">
        <IconChip icon={icon} color={iconColor} />
        <div className="min-w-0">
          <div className="text-xs muted">{label}</div>
          <div className="text-xl font-semibold leading-6">{value}</div>
          {sub && <div className="text-xs muted truncate">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export default function StatKpiRow({ metrics }) {
  const m = metrics || {};
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <StatCard icon={Users}       iconColor="#2563eb" label="Active employees"   value={m.headcount ?? '—'}      sub="This org" />
      <StatCard icon={Target}      iconColor="#22c55e" label="Goals on track"     value={m.goalsOnTrackPct ?? '—'} sub="On/Above trajectory" />
      <StatCard icon={AlertTriangle} iconColor="#f59e42" label="Open alerts"     value={m.openAlerts ?? '—'}     sub="Needs attention" />
      <StatCard icon={TrendingUp}  iconColor="#a21caf" label="Performance trend" value={m.trendPct ?? '—'}       sub="vs prior period" />
    </div>
  );
}

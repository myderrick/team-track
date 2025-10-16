// frontend/src/pages/GoalsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Autocomplete,
  Select, MenuItem, InputLabel, FormControl, Chip, InputAdornment, IconButton,
  Tooltip, Table, TableHead, TableRow, TableCell, TableBody, Divider, CssBaseline, Avatar, AvatarGroup, TableContainer, Paper
} from '@mui/material';
import { ThemeProvider, createTheme, alpha } from '@mui/material/styles';

import { CalendarToday, Edit, Delete } from '@mui/icons-material';
import { Plus, Minus } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';
import GoalsPageFilterBar from '@/components/GoalsPageFilterBar';
import { useDarkMode } from '@/theme/DarkModeProvider'; // ⬅️ shared dark mode
import '@/index.css';

const measurementUnits = ['%', 'points', 'calls', 'sessions', 'customers', 'tasks', 'leads', 'sales', 'units', 'hours'];
const currencies = ['USD', 'EUR', 'GBP', 'GHS'];

// ---------- helpers ----------
function safeJson(v, fallback = {}) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}
function currentQuarterLabel(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}
function buildQuarterFilterOptions() {
  const now = new Date();
  const Y = now.getFullYear();
  const opts = ['All'];
  for (let q = 1; q <= 4; q++) opts.push(`Q${q} ${Y}`);
  for (let q = 1; q <= 5; q++) opts.push(`Q${q} ${Y + 1}`);
  return opts;
}
function normalizeGoalRow(r) {
  const meta = safeJson(r.meta);
  console.log('normalizing', r, meta);
  return {
    ...r,
    id: r.id ?? r.goal_id,
    title: r.title || r.label || '',
    unit: r.unit || r.measure_unit || '',
    currency_code: r.currency_code || meta.measure_currency || r.currency || null,
    target: r.target ?? r.target_value ?? r.target_amount ?? null,
    quarter: r.quarter || r.goal_quarter || null,
    deadline: r.deadline || r.due_date || r.target_date || r.due_on || r.end_date || null,
    self_selected: String(meta.self_selected ?? '').toLowerCase() === 'true',
    owner_employee_id: r.owner_employee_id || null,
    department: r.department || r.department_name || r.dept || meta.department || null,
    description: r.description || r.notes || '',
    measure_type: r.measure_type || 'numeric',
     org_goal_id: r.org_goal_id ?? r.goal_org_goal_id ?? null,               // NEW
    alignment_label: meta.alignment_label || r.alignment_label || null,     // NEW
  };
}

const currencySymbol = (code) =>
  ({ USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵' }[(code || '').toUpperCase()] || '');
const fmtMoney = (n, code) => `${currencySymbol(code)} ${Number(n || 0).toLocaleString()}`;
const displayDeadline = (g) => {
  const d = g.deadline || g.due_date || g.target_date || g.due_on || g.end_date;
  return d ? String(d).slice(0, 10) : '—';
};
const quarterFilterOptions = buildQuarterFilterOptions();

// ---------- MUI theme that reads your CSS vars ----------
// ---------- MUI theme that reads your CSS vars ----------
function useMuiTheme(darkMode) {
  const light = {
    bg: '#f8fafc',
    card: '#ffffff',
    surface: '#f1f5f9',
    fg: '#0f172a',
    fgMuted: '#64748b',
    border: 'rgba(15, 23, 42, 0.12)',
    accent: '#2563eb',
  };
  const dark = {
    bg: '#0b1220',
    card: '#0f172a',
    surface: '#111826',
    fg: '#e5e7eb',
    fgMuted: '#9aa4b2',
    border: 'rgba(148, 163, 184, 0.24)',
    accent: '#60a5fa',
  };
  const t = darkMode ? dark : light;

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      // IMPORTANT: literal colors here, not CSS variables
      primary: { main: t.accent },
      secondary: { main: t.fgMuted },
      background: { default: t.bg, paper: t.card },
      text: { primary: t.fg, secondary: t.fgMuted },
      divider: t.border,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          :root { color-scheme: ${darkMode ? 'dark' : 'light'}; }
          /* tokens still drive the app via CSS vars */
          body {
            background: var(--bg, ${t.bg});
            color: var(--fg, ${t.fg});
          }
          * { scrollbar-color: var(--border, ${t.border}) transparent; }
          *::-webkit-scrollbar { height: 10px; width: 10px; }
          *::-webkit-scrollbar-thumb {
            background: color-mix(in oklab, var(--border, ${t.border}) 85%, transparent);
            border-radius: 8px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
        `,
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--card)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--card)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(2,6,23,0.12)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { color: 'var(--fg)', borderColor: 'var(--border)' },
          head: {
            color: 'var(--fg)',
            backgroundColor: 'color-mix(in oklab, var(--card) 90%, transparent)',
            fontWeight: 700,
            letterSpacing: 0.2,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--surface)',
            '& fieldset': { borderColor: 'var(--border)' },
            '&:hover fieldset': { borderColor: 'color-mix(in oklab, var(--fg) 28%, transparent)' },
            '&.Mui-focused fieldset': { borderColor: 'var(--accent)' },
          },
          input: { color: 'var(--fg)' },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: { backgroundColor: 'var(--surface)', color: 'var(--fg)' },
          icon: { color: 'var(--fg-muted)' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor: 'color-mix(in oklab, var(--surface) 85%, transparent)',
            color: 'var(--fg)',
            border: '1px solid var(--border)',
            borderRadius: 999,
          },
          outlined: { borderColor: 'var(--border)' },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            // alpha() only used on a literal color => safe
            backgroundColor: alpha('#000', darkMode ? 0.8 : 0.75),
            color: '#fff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 12 },
          containedPrimary: { color: '#fff' },
          outlined: { borderColor: 'var(--border)', color: 'var(--fg)' },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: 'var(--border)' } },
      },
    },
    typography: { fontSize: 13, h6: { letterSpacing: 0.2 } },
  });

  return theme;
}


// small deterministic color for initials
function stringToColor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}deg 60% 50%)`;
}
function InitialAvatar({ name }) {
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || '•';
  return (
    <Avatar
      sx={{
        width: 24, height: 24, fontSize: 12,
        bgcolor: stringToColor(name), color: '#fff'
      }}
    >
      {initials}
    </Avatar>
  );
}

// --- name helpers (replace InitialAvatar if you like) ---
function getInitials(name = '') {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .map(s => s[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || '•';
}

function PersonChip({ name }) {
  return (
    <Chip
      size="small"
      avatar={
        <Avatar
          sx={{
            width: 20,
            height: 20,
            fontSize: 10,
            bgcolor: stringToColor(name),
            color: '#fff',
          }}
        >
          {getInitials(name)}
        </Avatar>
      }
      label={name}
      variant="outlined"
      sx={{
        borderColor: 'var(--border)',
        bgcolor: 'color-mix(in oklab, var(--surface) 85%, transparent)',
      }}
    />
  );
}


function MeasurePill({ g }) {
  if (g.measure_type === 'monetary') {
    return <Chip size="small" label={fmtMoney(g.target ?? 0, g.currency_code)} />;
  }
  if (g.measure_type === 'numeric') {
    return <Chip size="small" label={`${Number(g.target ?? 0).toLocaleString()} ${g.unit || ''}`} />;
  }
  return <Chip size="small" variant="outlined" label="Qualitative" />;
}


export default function GoalsPage() {
  const { orgId } = useOrg();
  const { darkMode, toggleDark } = useDarkMode(); // from your provider
  const muiTheme = useMuiTheme(darkMode);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Filter bar
  const [quarter, setQuarter] = useState('All'); // default to All
  const [search, setSearch] = useState('');

  // Form quarter (separate from filter)
  const [formQuarter, setFormQuarter] = useState(currentQuarterLabel());

  // Live org data
  const [employees, setEmployees] = useState([]); // [{id, full_name, ...}]
  const [rows, setRows] = useState([]);           // normalized goals (+ assignees)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // --- layout-safe menus + quarter options ---
const menuProps = React.useMemo(() => ({
  disablePortal: false,
  keepMounted: true,
  PaperProps: { sx: { maxHeight: 360 } },
}), []);

const quarterOptions = React.useMemo(() => {
  const arr = [currentQuarterLabel()];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + 3 * i);
    const q = Math.floor(d.getMonth() / 3) + 1;
    arr.push(`Q${q} ${d.getFullYear()}`);
  }
  return arr;
}, []);


  // const [form, setForm] = useState({
  //   title: '',
  //   description: '',
  //   deadline: '',
  //   alignment: [],
  //   assignees: [], // [{id, label}]
  //   measureType: '',
  //   measureValue: '',
  //   measureCurrency: '',
  //   measureUnit: '',
  //   measureFrequency: '',
  //   department: ''
  // });
  const [editingId, setEditingId] = useState(null);

  const assigneeOptions = useMemo(
    () => (employees || []).map(e => ({ id: e.id, label: e.full_name })),
    [employees]
  );

  
// --- Alignment (org_goals) state/effects ---
const [alignmentOptions, setAlignmentOptions] = useState([]); // [{id,label,scope}]
const [alignmentLoading, setAlignmentLoading] = useState(false);

// Ensure initial form has a single-select object, not an array:
const NONE_ALIGN = { id: null, label: 'None', scope: '—' };

// when you create initial form:
const [form, setForm] = useState({
  title: '', description: '', deadline: '',
  alignmentObj: NONE_ALIGN,            // <-- single select object
  assignees: [],
  measureType: '',
  measureValue: '', measureCurrency: '', measureUnit: '', measureFrequency: '',
  department: ''
});

// load alignment options whenever org or form opens
useEffect(() => {
  if (!orgId || !showForm) return;
  (async () => {
    setAlignmentLoading(true);
    const { data, error } = await supabase
      .schema('public')
      .rpc('org_goal_options', { p_org_id: orgId });
    setAlignmentOptions(error ? [] : (data || []));
    setAlignmentLoading(false);
  })();
}, [orgId, showForm]);

// helper to upsert new alignment then refresh and select it
async function createAlignmentAndSelect(label) {
  const clean = (label || '').trim();
  if (!clean) return;

  const { data: id, error } = await supabase
    .schema('public')
    .rpc('upsert_org_goal', { p_org_id: orgId, p_label: clean });
  if (error) return;

  const res = await supabase.schema('public').rpc('org_goal_options', { p_org_id: orgId });
  const opts = res.error ? [] : (res.data || []);
  setAlignmentOptions(opts);

  const hit = opts.find(o => String(o.id) === String(id));
  setForm(f => ({ ...f, alignmentObj: hit || { id, label: clean, scope: 'Your Organization' } }));
}


  async function reload() {
    if (!orgId) { setEmployees([]); setRows([]); setLoading(false); return; }
    setLoading(true); setErr('');

    const eRes = await supabase.schema('public').rpc('org_employees', { p_org_id: orgId });

    const p_quarter = quarter === 'All' ? null : quarter;
// --- choose the right RPC based on quarter ---
let gRes;
if (quarter === 'All') {
  // v1 accepts NULL / “all quarters”
  gRes = await supabase
    .schema('public')
    .rpc('org_goals_catalog', { p_org_id: orgId, p_quarter: null });
} else {
  // v2 requires a concrete quarter label like "Q2 2025"
  gRes = await supabase
    .schema('public')
    .rpc('org_goals_catalog_v2', { p_org_id: orgId, p_quarter: quarter });
}

// optional safety net (should rarely run now)
if (gRes.error) {
  console.warn('v2/v1 RPC failed; falling back:', gRes.error);
  const v1 = await supabase
    .schema('public')
    .rpc('org_goals_catalog', { p_org_id: orgId, p_quarter: quarter === 'All' ? null : quarter });
  gRes = v1.error
    ? v1
    : { data: (v1.data || []).map(row => ({ ...row, currency_code: row.currency_code || 'USD' })), error: null };
}



    if (gRes.error) {
      const v1 = await supabase.schema('public').rpc('org_goals_catalog', { p_org_id: orgId, p_quarter });
      gRes = v1.error
        ? v1
        : { data: (v1.data || []).map(row => ({ ...row, currency_code: row.currency_code || 'USD' })), error: null };
    }

    const employeesData = eRes.error ? [] : (eRes.data || []);
    const baseGoals     = gRes.error ? [] : (gRes.data || []);
    let normalized      = baseGoals.map(normalizeGoalRow);

    // Backfill missing deadline/quarter from app.goals when needed
    const idsNeedingBackfill = normalized
      .filter(g => (!g.deadline || !g.quarter) && g.id)
      .map(g => g.id);

    if (idsNeedingBackfill.length > 0) {
      const bf = await supabase
        .schema('app')
        .from('goals')
        .select('id, deadline, quarter')
        .in('id', idsNeedingBackfill);

      if (!bf.error && bf.data) {
        const byId = new Map(bf.data.map(r => [String(r.id), r]));
        normalized = normalized.map(g => {
          const hit = byId.get(String(g.id));
          if (!hit) return g;
          return {
            ...g,
            deadline: g.deadline || hit.deadline || null,
            quarter: g.quarter || hit.quarter || null,
          };
        });
      }
    }

    // Assignments
    const nameByIdStr = new Map(employeesData.map(e => [String(e.id), e.full_name]));
    let assignedByGoal = {};
    if (normalized.length) {
      const goalIds = normalized.map(g => g.id);
      const aRes = await supabase.schema('app')
        .from('goal_assignments')
        .select('goal_id, employee_id')
        .in('goal_id', goalIds);

      const assigns = aRes.error ? [] : (aRes.data || []);
      assignedByGoal = assigns.reduce((acc, r) => {
        const name = nameByIdStr.get(String(r.employee_id));
        if (!name) return acc;
        (acc[r.goal_id] ||= []).push({ id: r.employee_id, name });
        return acc;
      }, {});
    }

    const withAssignees = normalized.map(g => {
      const explicit = assignedByGoal[g.id] || [];
      if (explicit.length > 0) return { ...g, assignees: explicit };

      if (g.self_selected && g.owner_employee_id) {
        const ownerName = nameByIdStr.get(String(g.owner_employee_id));
        if (ownerName) return { ...g, assignees: [{ id: g.owner_employee_id, name: ownerName }] };
      }
      return { ...g, assignees: [] };
    });

    setEmployees(employeesData);
    setRows(withAssignees);
    setErr(eRes.error?.message || gRes.error?.message || '');
    setLoading(false);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [orgId, quarter]);

  const handleChange = (field) => (e, maybe) => {
    const val = e?.target !== undefined ? e.target.value : maybe;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter(g => {
      const hay = [
        g.title, g.description, g.department, g.measure_type, g.unit,      g.alignment_label,                               // NEW

        ...(g.assignees?.map(a => a.name) || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  console.log('render', { rows, filteredRows });  

  async function handleSave() {
    setErr('');
    if (!orgId || !form.title.trim()) return;

    const measure_type = form.measureType || 'numeric';
    const unit = measure_type === 'monetary' ? '' : (form.measureUnit || '');
    const org_goal_id = form.alignmentObj?.id || null;
const alignment_label = form.alignmentObj?.label || 'None';

    const target_value =
      (measure_type === 'qualitative')
        ? null
        : Number.isFinite(Number(form.measureValue))
          ? Number(form.measureValue)
          : 0;

   const payload = {
  organization_id: orgId,
  department: form.department || null,
  label: form.title.trim(),
  unit,
  quarter: formQuarter,
  start_value: 0,
  target_value,
  is_active: true,
  description: form.description || null,
  deadline: form.deadline || null,
  measure_type,
  org_goal_id, // <-- if you added the FK
  meta: {
    alignment_label,             // fallback for reporting
    measure_currency: measure_type === 'monetary' ? (form.measureCurrency || 'GHS') : null,
    measure_frequency: form.measureFrequency || null,
  },
};
    if (editingId) {
      const { error } = await supabase.schema('app').from('goals').update(payload).eq('id', editingId);
      if (error) { setErr(error.message); return; }
      await supabase.schema('app').from('goal_assignments').delete().eq('goal_id', editingId);
      if (form.assignees.length > 0) {
        const rows = form.assignees.map(a => ({ goal_id: editingId, employee_id: a.id }));
        await supabase.schema('app').from('goal_assignments').insert(rows);
      }
    } else {
      const { data, error } = await supabase.schema('app').from('goals').insert(payload).select('id').single();
      if (error) { setErr(error.message); return; }
      const goalId = data.id;
      if (form.assignees.length > 0) {
        const rows = form.assignees.map(a => ({ goal_id: goalId, employee_id: a.id }));
        await supabase.schema('app').from('goal_assignments').insert(rows);
      }
    }

    setEditingId(null);
    setShowForm(false);
    setForm({
      title: '', description: '', deadline: '',
      alignment: [], assignees: [],
      measureType: '', measureValue: '', measureCurrency: '', measureUnit: '', measureFrequency: '',
      department: ''
    });
    setFormQuarter(currentQuarterLabel());
    await reload();
  }

  async function handleEdit(goal) {
    setEditingId(goal.id);
    setShowForm(true);
    setFormQuarter(goal.quarter || currentQuarterLabel());

    const { data: assigns } = await supabase.schema('app')
      .from('goal_assignments').select('employee_id').eq('goal_id', goal.id);

    const assigned = (assigns || []).map(a => {
      const emp = employees.find(e => String(e.id) === String(a.employee_id));
      return emp ? { id: emp.id, label: emp.full_name } : null;
    }).filter(Boolean);

    let defaultAssignees = assigned;
    if (defaultAssignees.length === 0 && goal.self_selected && goal.owner_employee_id) {
      const owner = employees.find(e => String(e.id) === String(goal.owner_employee_id));
      if (owner) defaultAssignees = [{ id: owner.id, label: owner.full_name }];
    }

    // Find alignment from goal.org_goal_id or meta.alignment_label
  let alignmentObj = { id: null, label: 'None', scope: '—' };
  if (goal.org_goal_id && alignmentOptions.length) {
    const hit = alignmentOptions.find(o => String(o.id) === String(goal.org_goal_id));
    if (hit) alignmentObj = hit;
  } else if (goal.meta?.alignment_label && alignmentOptions.length) {
    const hit = alignmentOptions.find(o => o.label.toLowerCase() === goal.meta.alignment_label.toLowerCase());
    if (hit) alignmentObj = hit;
  }

    setForm(f => ({
      ...f,
      title: goal.title,
      description: goal.description || '',
      deadline: goal.deadline || '',
      assignees: defaultAssignees,
      measureType: goal.measure_type || 'numeric',
      measureValue: String(goal.target ?? ''),
      measureCurrency: goal.currency_code || 'GHS',
      measureUnit: goal.unit || '',
      measureFrequency: '',
      department: goal.department || ''
    }));
  }

  async function handleDelete(goalId) {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;
    await supabase.schema('app').from('goals').delete().eq('id', goalId);
    if (editingId === goalId) { setEditingId(null); setShowForm(false); }
    await reload();
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
        <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--fg)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1">
          <TopBar onMenuClick={() => setSidebarOpen(o => !o)} />

          <GoalsPageFilterBar
            subtitle={quarter === 'All' ? 'All quarters' : `Filtered: ${quarter}`}
            quarter={quarter}
            setQuarter={setQuarter}
            quarterOptions={quarterFilterOptions}
            search={search}
            setSearch={setSearch}
            onNewGoal={() => { setEditingId(null); setShowForm(true); }}
          />

          <main className="flex-1 ml-20 mt-4 mr-6 mb-6 px-0 overflow-auto">
            <Box sx={{ maxWidth: 1200, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Form Card */}
              <Card sx={{ p: 0 }}>
                <Box
                  onClick={() => setShowForm(f => !f)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    borderBottom: showForm ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '999px',
                      bgcolor: 'color-mix(in oklab, var(--accent) 15%, transparent)',
                      color: 'var(--accent)'
                    }}
                  >
                    <Plus style={{ width: 18, height: 18 }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'var(--accent)' }}>
                    {showForm ? (editingId ? 'Edit Goal' : 'Add New Goal') : 'Add New Goal'}
                  </Typography>
                  <IconButton size="small" sx={{ ml: 'auto', color: 'var(--accent)' }}>
                    {showForm ? (
                      <Minus style={{ width: 22, height: 22 }} />
                    ) : (
                      <Plus style={{ width: 22, height: 22 }} />
                    )}
                  </IconButton>
                </Box>

                {showForm && (
                <CardContent sx={{ pt: 3 }}>
  <Typography variant="subtitle2" color="text.secondary" mb={3}>
    Enter clear, actionable details for your goal.
  </Typography>

  {/* BASICS */}
  <Typography variant="overline" sx={{ color: 'var(--fg-muted)' }}>Basics</Typography>

  {/* Row 1: Title • Description • Measure Type */}
  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
    <TextField
      label="Goal Title"
      value={form.title}
      onChange={handleChange('title')}
      helperText='Be specific and measurable (e.g., “Increase MRR by 15%”).'
      fullWidth
      sx={{ flex: '1 1 360px', minWidth: 320 }}
    />

    <TextField
      label="Description"
      value={form.description}
      onChange={handleChange('description')}
      fullWidth
      multiline
      minRows={2}
      helperText="Add context: scope, owner expectations, constraints."
      sx={{ flex: '2 1 520px', minWidth: 360 }}
    />

    <FormControl fullWidth size="small" sx={{ flex: '0 1 240px', minWidth: 220 }}>
      <InputLabel>Measure Type</InputLabel>
      <Select
        label="Measure Type"
        value={form.measureType}
        onChange={handleChange('measureType')}
        MenuProps={menuProps}
        sx={{ '& .MuiSelect-select': { textOverflow: 'ellipsis', overflow: 'hidden' } }}
      >
        <MenuItem value="numeric">Numeric</MenuItem>
        <MenuItem value="monetary">Monetary</MenuItem>
        <MenuItem value="qualitative">Qualitative</MenuItem>
      </Select>
    </FormControl>
  </Box>

  <Divider sx={{ my: 3 }} />

  {/* MEASUREMENT */}
  <Typography variant="overline" sx={{ color: 'var(--fg-muted)' }}>Measurement</Typography>

  {form.measureType === 'numeric' && (
    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      <TextField
        type="number"
        label="Target Value"
        value={form.measureValue}
        onChange={handleChange('measureValue')}
        fullWidth
        size="small"
        sx={{ flex: '1 1 280px', minWidth: 220 }}
      />
      <FormControl fullWidth size="small" sx={{ flex: '1 1 280px', minWidth: 220 }}>
        <InputLabel>Unit</InputLabel>
        <Select
          label="Unit"
          value={form.measureUnit}
          onChange={handleChange('measureUnit')}
          MenuProps={menuProps}
        >
          {measurementUnits.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth size="small" sx={{ flex: '1 1 280px', minWidth: 220 }}>
        <InputLabel>Frequency</InputLabel>
        <Select
          label="Frequency"
          value={form.measureFrequency}
          onChange={handleChange('measureFrequency')}
          MenuProps={menuProps}
        >
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
          <MenuItem value="quarterly">Quarterly</MenuItem>
          <MenuItem value="yearly">Yearly</MenuItem>
        </Select>
      </FormControl>
    </Box>
  )}

  {form.measureType === 'monetary' && (
    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      <FormControl fullWidth size="small" sx={{ flex: '1 1 280px', minWidth: 220 }}>
        <InputLabel>Currency</InputLabel>
        <Select
          label="Currency"
          value={form.measureCurrency}
          onChange={handleChange('measureCurrency')}
          MenuProps={menuProps}
        >
          {currencies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField
        type="number"
        label="Target Amount"
        value={form.measureValue}
        onChange={handleChange('measureValue')}
        fullWidth
        size="small"
        sx={{ flex: '1 1 280px', minWidth: 220 }}
      />
      {/* spacer when there are only two controls */}
      <Box sx={{ flex: '1 1 280px', minWidth: 220 }} />
    </Box>
  )}

  {form.measureType === 'qualitative' && (
    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      <TextField
        label="Qualitative Criteria"
        value={form.measureValue}
        onChange={handleChange('measureValue')}
        fullWidth
        multiline
        minRows={3}
        sx={{ flex: '1 1 720px', minWidth: 480 }}
      />
    </Box>
  )}

  <Divider sx={{ my: 3 }} />

  {/* TIMING & ORG */}
  <Typography variant="overline" sx={{ color: 'var(--fg-muted)' }}>Timing & Org</Typography>
  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
    <TextField
      label="Department (optional)"
      value={form.department}
      onChange={handleChange('department')}
      fullWidth
      size="small"
      sx={{ flex: '1 1 320px', minWidth: 220 }}
    />
    <FormControl fullWidth size="small" sx={{ flex: '1 1 320px', minWidth: 220 }}>
      <InputLabel>Quarter</InputLabel>
      <Select
        label="Quarter"
        value={formQuarter}
        onChange={(e) => setFormQuarter(e.target.value)}
        MenuProps={menuProps}
        sx={{ '& .MuiSelect-select': { textOverflow: 'ellipsis', overflow: 'hidden' } }}
      >
        {quarterOptions.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
      </Select>
    </FormControl>
    <TextField
      label="Deadline"
      type="date"
      InputLabelProps={{ shrink: true }}
      value={form.deadline}
      onChange={handleChange('deadline')}
      fullWidth
      size="small"
      InputProps={{ endAdornment: (<InputAdornment position="end"><CalendarToday /></InputAdornment>) }}
      sx={{ flex: '1 1 320px', minWidth: 220 }}
    />
  </Box>

  <Divider sx={{ my: 3 }} />

  {/* ALIGNMENT & PEOPLE */}
  <Typography variant="overline" sx={{ color: 'var(--fg-muted)' }}>Alignment & People</Typography>

  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
    {/* Alignment (single select) */}
    <Autocomplete
      disablePortal={false}
      options={[NONE_ALIGN, ...alignmentOptions]}
      loading={alignmentLoading}
      value={form.alignmentObj || NONE_ALIGN}
      onChange={async (_, option) => {
        if (!option) { setForm(f => ({ ...f, alignmentObj: NONE_ALIGN })); return; }
        if (option.__addNew && option.label) {
          const raw = option.label.replace(/^Add\s+"?/i, '').replace(/"?$/,'').trim();
          await createAlignmentAndSelect(raw);
          return;
        }
        setForm(f => ({ ...f, alignmentObj: option }));
      }}
      getOptionLabel={(o) => (typeof o === 'string' ? o : (o?.label || ''))}
      isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id) && a?.label === b?.label}
      groupBy={(o) => o.scope}
      filterOptions={(options, state) => {
        const input = (state.inputValue || '').trim();
        const base = options.filter(o => (o?.label || '').toLowerCase().includes(input.toLowerCase()));
        if (input && !base.some(o => (o?.label || '').toLowerCase() === input.toLowerCase())) {
          base.push({ id: undefined, label: `Add "${input}"`, scope: 'Your Organization', __addNew: true });
        }
        return base;
      }}
      slotProps={{ paper: { sx: { maxHeight: 360 } }, popper: { placement: 'bottom-start' } }}
      renderOption={(props, option) => (
        <li {...props} key={`${option.scope}-${option.label}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 8, background: option.id ? 'var(--accent)' : 'var(--border)' }} />
          <span style={{ flex: 1 }}>{option.label}</span>
          <Chip size="small" variant="outlined" label={option.scope} />
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Alignment (broad org goal)"
          placeholder="Select or add"
          helperText="e.g., Revenue Growth, Customer Service"
          size="small"
          sx={{ '& .MuiInputBase-input': { textOverflow: 'ellipsis' } }}
        />
      )}
      sx={{ flex: '2 1 520px', minWidth: 360 }}
    />

    {/* Assignees (multi) */}
    <Autocomplete
      multiple
      disablePortal={false}
      options={assigneeOptions}
      getOptionLabel={(o) => o.label}
      value={form.assignees}
      onChange={(_, v) => setForm(f => ({ ...f, assignees: v }))}
      slotProps={{ paper: { sx: { maxHeight: 360 } } }}
      renderInput={(params) => (
        <TextField {...params} label="Assign to" placeholder="Team members" size="small" />
      )}
      sx={{ flex: '1 1 360px', minWidth: 320 }}
    />
  </Box>

  {/* ACTIONS */}
  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 3 }}>
    <Button variant="outlined" onClick={() => { setEditingId(null); setShowForm(false); }}>
      Cancel
    </Button>
    <Button variant="contained" onClick={handleSave}>
      {editingId ? 'Update Goal' : 'Create Goal'}
    </Button>
  </Box>
</CardContent>



                )}
              </Card>

              {/* List Card */}
              <Card>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', px: 2, pt: 2 }}>
                  <Typography variant="h6" fontWeight={600}>Goals</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {filteredRows.length} {filteredRows.length === 1 ? 'item' : 'items'}
                  </Typography>
                </Box>
                <CardContent>
                  {loading ? (
  <div className="p-4">
    <div className="text-sm text-[var(--fg-muted)]">Loading…</div>
  </div>
) : err ? (
  <EmptyState title="Unable to load goals" subtitle={err} />
) : filteredRows.length === 0 ? (
  rows.length === 0 ? (
    <EmptyState title="No goals added yet" subtitle="Create your first goal to get started." />
  ) : (
    <EmptyState title="No matches" subtitle="Try a different search." />
  )
) : (
  <TableContainer
    component={Paper}
    elevation={0}
    sx={{
      borderRadius: 0,
      border: '1px solid var(--border)',
      // overflow: 'hidden',
      // maxHeight: 520,
    }}
  >
    <Table stickyHeader size="small"
      sx={{
        '& td, & th': { borderColor: 'var(--border)' },
        '& thead th': {
          backdropFilter: 'saturate(180%) blur(8px)',
        },
        '& tbody tr:hover': {
          backgroundColor: 'color-mix(in oklab, var(--surface) 88%, transparent)',
        },
        '& tbody tr:nth-of-type(odd)': {
          backgroundColor: 'color-mix(in oklab, var(--surface) 80%, transparent)',
        },
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: 460 }}>Goal</TableCell>
          <TableCell sx={{ width: 180 }}>Measure</TableCell>
          <TableCell sx={{ width: 220 }}>Alignment</TableCell>
          <TableCell sx={{ width: 110 }}>Quarter</TableCell>
          <TableCell sx={{ width: 120 }}>Deadline</TableCell>
          <TableCell sx={{ width: 160 }}>Department</TableCell>
          <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {filteredRows.map((g) => (
          <TableRow key={g.id} hover sx={{ height: 56 }}>
            <TableCell sx={{ maxWidth: 460 }}>
  <Typography fontWeight={700} title={g.title}>
    {g.title}
  </Typography>

  {g.description && (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}  // ⬅️ full content
      title={g.description}
    >
      {g.description}
    </Typography>
  )}

  {(g.assignees?.length ?? 0) > 0 && (
    <Box mt={1} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {g.assignees.slice(0, 4).map(a => (
        <PersonChip key={a.id} name={a.name} />
      ))}
      {g.assignees.length > 4 && (
        <Tooltip title={g.assignees.slice(4).map(a => a.name).join(', ')}>
          <Chip size="small" variant="outlined" label={`+${g.assignees.length - 4} more`} />
        </Tooltip>
      )}
    </Box>
  )}
</TableCell>


            <TableCell sx={{ whiteSpace: 'nowrap' }}>
              <MeasurePill g={g} />
            </TableCell>

            {/* Alignment */}
            <TableCell sx={{ maxWidth: 220 }}>
              {g.alignment_label
                ? <Chip size="small" variant="outlined" label={g.alignment_label} />
                : <span>—</span>}
            </TableCell>

            <TableCell>{g.quarter || '—'}</TableCell>
            <TableCell>{displayDeadline(g)}</TableCell>
            <TableCell sx={{ whiteSpace: 'nowrap' }}>
  {g.department
    ? <Chip size="small" variant="outlined" label={g.department} />
    : (g.meta?.department || '—')}
</TableCell>


            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title="Edit Goal">
                <IconButton color="primary" size="small" onClick={() => handleEdit(g)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete Goal">
                <IconButton color="error" size="small" onClick={() => handleDelete(g.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
)}

                </CardContent>
              </Card>
            </Box>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

// frontend/src/pages/GoalsPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, TextField, Button, Typography, Autocomplete,
  Select, MenuItem, InputLabel, FormControl, Chip, InputAdornment, IconButton,
  Tooltip, Table, TableHead, TableRow, TableCell, TableBody, Divider
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { CalendarToday, Edit, Delete } from '@mui/icons-material';
import { Plus, Minus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';
import '@/index.css';
import '@/components/style.css';

const goalTypes = [
  { id: 'performance', label: 'Performance Goal' },
  { id: 'development', label: 'Development Goal' },
  { id: 'collaborative', label: 'Collaborative Goal' },
];

const measurementUnits = ['%', 'points', 'calls', 'sessions', 'customers', 'tasks', 'leads', 'sales', 'units', 'hours'];
const currencies = ['USD', 'EUR', 'GBP', 'GHS'];

// Filters
const quarterOptions = ['Q1 2025','Q2 2025','Q3 2025','Q4 2025'];

export default function GoalsPage() {
  const { orgId } = useOrg();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [quarter, setQuarter] = useState(quarterOptions[1]);

  // Live org data
  const [employees, setEmployees] = useState([]); // [{id, full_name, department}]
  const [rows, setRows] = useState([]);           // goals for org+quarter
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    type: '',
    alignment: [],
    assignees: [],              // [{id, label}]
    measureType: '',
    measureValue: '',
    measureCurrency: '',
    measureUnit: '',
    measureFrequency: '',
    department: ''
  });
  const [editingId, setEditingId] = useState(null);

  // Dark mode
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) setDarkMode(saved === 'true');
    else if (window.matchMedia) setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Load employees + goals
  async function reload() {
    if (!orgId) { setEmployees([]); setRows([]); setLoading(false); return; }
    setLoading(true); setErr('');
   const eRes = await supabase.schema('public').rpc('org_employees', { p_org_id: orgId });
 let gRes = await supabase.schema('public').rpc('org_goals_catalog_v2', { p_org_id: orgId, p_quarter: quarter });
 if (gRes.error) {
   // fallback to v1 but synthesize currency_code
   const v1 = await supabase.schema('public').rpc('org_goals_catalog', { p_org_id: orgId, p_quarter: quarter });
   gRes = v1.error
     ? v1
     : { data: (v1.data || []).map(row => ({ ...row, currency_code: 'USD' })), error: null };
 }

    if (eRes.error || gRes.error) console.error('Error loading goals or employees:', eRes.error || gRes.error);
    setEmployees(eRes.error ? [] : (eRes.data || []));
    setRows(gRes.error ? [] : (gRes.data || []));
    setErr(eRes.error?.message || gRes.error?.message || '');
    setLoading(false);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [orgId, quarter]);

  // Helpers
  const assigneeOptions = useMemo(
    () => (employees || []).map(e => ({ id: e.id, label: e.full_name })),
    [employees]
  );

  const handleChange = (field) => (e, maybe) => {
    const val = e?.target !== undefined ? e.target.value : maybe;
    setForm((f) => ({ ...f, [field]: val }));
  };
const currencySymbol = (code) =>
  ({ USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵' }[(code || '').toUpperCase()] || code || '');

const fmtMoney = (n, code) => `${currencySymbol(code)} ${Number(n||0).toLocaleString()}`;


  // CREATE / UPDATE
  async function handleSave() {
    setErr('');
    if (!orgId || !form.title.trim()) return;

    // Map measure to DB
    const measure_type = form.measureType || 'numeric';
    const unit = measure_type === 'monetary' ? '' : (form.measureUnit || '');
    const target_value = Number(form.measureValue || 0);

    const payload = {
      organization_id: orgId,
      department: form.department || null,
      label: form.title.trim(),
      unit,
      quarter,
      start_value: 0,
      target_value,
      is_active: true,
      description: form.description || null,
      deadline: form.deadline || null,
      measure_type,
      meta: {
        alignment: form.alignment || [],
        measure_currency: measure_type === 'monetary' ? (form.measureCurrency || 'GHS') : null,
        measure_frequency: form.measureFrequency || null,
        goal_type: form.type || null
      }
    };

    if (editingId) {
      const { error } = await supabase.schema('app')
        .from('goals').update(payload).eq('id', editingId);
      if (error) { setErr(error.message); return; }

      // reset assignments then reinsert
      await supabase.schema('app').from('goal_assignments').delete().eq('goal_id', editingId);
      if (form.assignees.length > 0) {
        const rows = form.assignees.map(a => ({ goal_id: editingId, employee_id: a.id }));
        await supabase.schema('app').from('goal_assignments').insert(rows);
      }
    } else {
      const { data, error } = await supabase.schema('app')
        .from('goals').insert(payload).select('id').single();
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
      title: '', description: '', deadline: '', type: '',
      alignment: [], assignees: [],
      measureType: '', measureValue: '', measureCurrency: '', measureUnit: '', measureFrequency: '',
      department: ''
    });
    await reload();
  }

  // EDIT PREFILL (fetch assignments)
  async function handleEdit(goal) {
    setEditingId(goal.id);
    setShowForm(true);

    // fetch this goal’s assignments
    const { data: assigns } = await supabase.schema('app')
      .from('goal_assignments').select('employee_id').eq('goal_id', goal.id);

    const assigned = (assigns || []).map(a => {
      const emp = employees.find(e => e.id === a.employee_id);
      return emp ? { id: emp.id, label: emp.full_name } : null;
    }).filter(Boolean);

    setForm(f => ({
      ...f,
      title: goal.title,
      description: goal.description || '',
      deadline: goal.deadline || '',
      type: '', // optional taxonomy
      alignment: [], // stored in meta, fetch if you want
      assignees: assigned,
      measureType: goal.measure_type || 'numeric',
      measureValue: String(goal.target || ''),
      measureCurrency: goal.currency_code || 'GHS',
      measureUnit: goal.unit || '',
      measureFrequency: '',
      department: goal.department || ''
    }));
  }

  async function handleDelete(goalId) {
    await supabase.schema('app').from('goals').delete().eq('id', goalId);
    if (editingId === goalId) { setEditingId(null); setShowForm(false); }
    await reload();
  }

  return (
    <div className="flex h-screen overflow-hidden dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Goals overview for {quarter}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-6 items-center">
            <select value={quarter} onChange={e => setQuarter(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600">
              {quarterOptions.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <main className="flex-1 ml-20 mt-4 mr-4 mb-4 px-0 overflow-auto">
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 32px rgba(33,122,244,0.08)', bgcolor: 'background.paper',
                      maxWidth: 1200, mx: 'auto', mt: 2, mb: 6, p: 1, border: '1.5px solid #e0e7ef' }}>
            <CardContent>
              {/* Header toggle */}
              <Box display="flex" alignItems="center" mb={2} sx={{ cursor: 'pointer' }}
                   onClick={() => setShowForm(f => !f)}>
                <Plus style={{
                  color: '#2186eb', padding: '6px', borderRadius: '50px',
                  width: 28, height: 28, marginRight: 10, cursor: 'pointer',
                }} />
                <Typography variant="h7" fontWeight={700} color="#2186eb">
                  {showForm ? (editingId ? 'Edit Goal' : 'Add New Goal') : 'Add New Goal'}
                </Typography>
                <IconButton size="small" sx={{ ml: 'auto', color: '#2186eb' }}>
                  {showForm
                    ? <Minus style={{ backgroundColor: '#e0f0ff', color: '#2186eb', padding: 6, borderRadius: 50, width: 28, height: 28 }} />
                    : <Plus  style={{ backgroundColor: '#e0f0ff', color: '#2186eb', padding: 6, borderRadius: 50, width: 28, height: 28 }} />}
                </IconButton>
              </Box>

              {showForm && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" mb={2}>
                    Enter clear, actionable details for your goal.
                  </Typography>

                  <Box>
                    <Grid container spacing={3}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="Goal Title" value={form.title} onChange={handleChange('title')} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth>
                          <InputLabel>Measure Type</InputLabel>
                          <Select label="Measure Type" value={form.measureType} onChange={handleChange('measureType')}>
                            <MenuItem value="numeric">Numeric</MenuItem>
                            <MenuItem value="monetary">Monetary</MenuItem>
                            <MenuItem value="qualitative">Qualitative</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField label="Department (optional)" value={form.department} onChange={handleChange('department')} fullWidth />
                      </Grid>

                      <Grid size={{ xs: 12, md: 6 }}>
                        <TextField label="Description" value={form.description} onChange={handleChange('description')} fullWidth multiline minRows={3} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField label="Deadline" type="date" InputLabelProps={{ shrink: true }}
                                   value={form.deadline} onChange={handleChange('deadline')} fullWidth
                                   InputProps={{ endAdornment: (<InputAdornment position="end"><CalendarToday /></InputAdornment>) }} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth>
                          <InputLabel>Quarter</InputLabel>
                          <Select label="Quarter" value={quarter} onChange={e => setQuarter(e.target.value)}>
                            {quarterOptions.map(q => <MenuItem key={q} value={q}>{q}</MenuItem>)}
                          </Select>
                        </FormControl>
                      </Grid>

                      {/* Measure inputs */}
                      {form.measureType === 'numeric' && (
                        <>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <TextField type="number" label="Target Value" value={form.measureValue} onChange={handleChange('measureValue')} fullWidth />
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth>
                              <InputLabel>Unit</InputLabel>
                              <Select label="Unit" value={form.measureUnit} onChange={handleChange('measureUnit')}>
                                {measurementUnits.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth>
                              <InputLabel>Frequency</InputLabel>
                              <Select label="Frequency" value={form.measureFrequency} onChange={handleChange('measureFrequency')}>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="quarterly">Quarterly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </>
                      )}
                      {form.measureType === 'monetary' && (
                        <>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <FormControl fullWidth>
                              <InputLabel>Currency</InputLabel>
                              <Select label="Currency" value={form.measureCurrency} onChange={handleChange('measureCurrency')}>
                                {currencies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid size={{ xs: 12, md: 3 }}>
                            <TextField type="number" label="Target Amount" value={form.measureValue} onChange={handleChange('measureValue')} fullWidth />
                          </Grid>
                        </>
                      )}
                      {form.measureType === 'qualitative' && (
                        <Grid size={{ xs: 12 }}>
                          <TextField label="Qualitative Criteria" value={form.measureValue} onChange={handleChange('measureValue')} fullWidth multiline minRows={3} />
                        </Grid>
                      )}

                      {/* Alignment */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Autocomplete
                          multiple freeSolo
                          options={[]}
                          value={form.alignment}
                          onChange={(_, v) => setForm(f => ({ ...f, alignment: v }))}
                          renderInput={params => <TextField {...params} label="Align to Objectives (optional)" placeholder="Type or select" />}
                        />
                      </Grid>

                      {/* Assignees */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Autocomplete
                          multiple options={assigneeOptions} getOptionLabel={o => o.label}
                          value={form.assignees}
                          onChange={(_, v) => setForm(f => ({ ...f, assignees: v }))}
                          renderInput={params => <TextField {...params} label="Assign to" placeholder="Team members" />}
                        />
                      </Grid>

                      {/* Actions */}
                      <Grid size={{ xs: 12, md: 12 }} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                        <Button variant="outlined" onClick={() => { setEditingId(null); setShowForm(false); }} sx={{ mr: 2 }}>
                          Cancel
                        </Button>
                        <Button variant="contained" onClick={handleSave}>
                          {editingId ? 'Update Goal' : 'Create Goal'}
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider sx={{ my: 4 }} />
                </>
              )}

              <Typography variant="h6" fontWeight={600} mb={2}>Existing Goals</Typography>

              {loading ? (
                <div className="p-4"><div className="text-sm text-gray-500">Loading…</div></div>
              ) : err ? (
                <EmptyState title="Unable to load goals" subtitle={err} />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Goal</TableCell>
                      <TableCell>Measure</TableCell>
                      <TableCell>Deadline</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(rows || []).map(g => (
                      <TableRow key={g.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{g.title}</Typography>
                          {g.description && (
                            <Typography variant="body2" color="text.secondary">{g.description}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {g.measure_type === 'monetary'
                            ? fmtMoney(g.target, g.currency_code)
                            : g.measure_type === 'numeric'
                              ? `${Number(g.target).toLocaleString()} ${g.unit || ''}`
                              : 'Qualitative'}
                        </TableCell>
                        <TableCell>{g.deadline || '—'}</TableCell>
                        <TableCell>{g.department || '—'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit Goal"><IconButton color="primary" size="small" onClick={() => handleEdit(g)}><Edit /></IconButton></Tooltip>
                          <Tooltip title="Delete Goal"><IconButton color="error" size="small" onClick={() => handleDelete(g.id)}><Delete /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">No goals added yet.</Typography>
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              <Box mt={4} sx={{ textAlign: 'center' }}>
                <Button variant="outlined" size="large" onClick={() => (window.location.href = '/dashboard')}
                        sx={{ borderRadius: 24, px: 4, py: 1.5, fontSize: 18, fontWeight: 600, boxShadow: '0 2px 12px rgba(33,134,235,0.16)' }}>
                  Back to Dashboard
                </Button>
              </Box>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

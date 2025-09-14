import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Autocomplete,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Chip,
    InputAdornment,
    IconButton,
    Tooltip,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { CalendarToday, Edit, Delete } from '@mui/icons-material';
import {
    Menu,
    Plus,
    Minus,
    Sun,
    Moon,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { allGoals as templateGoals } from '../data';  // ← import your templates
import '../index.css';
import '../components/style.css';

const goalTypes = [
    { id: 'performance', label: 'Performance Goal' },
    { id: 'development', label: 'Development Goal' },
    { id: 'collaborative', label: 'Collaborative Goal' },
];
const higherGoals = [
    'Increase Company Revenue',
    'Improve Team Productivity',
    'Launch New Product',
];
const dummyReports = [
    { id: 'u1', label: 'Alice Johnson' },
    { id: 'u2', label: 'Bob Smith' },
    { id: 'u3', label: 'Carol Lee' },
];
const currencies = ['GHS', 'USD', 'EUR', 'GBP'];

// Filter options
const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const deptOptions = ['All Departments', 'Sales', 'IT', 'Operations'];
const locationOptions = ['All Locations', 'Ghana', 'Nigeria', 'Rest of the World'];
const quarter = 'Q2 2025'; // default quarter

const measurementFrequency = ['weekly', 'monthly', 'quarterly'];

const measurementUnits = ['%', 'points', 'calls', 'sessions', 'customers', 'tasks', 'leads', 'sales', 'units', 'hours'];

const initialGoals = [
    {
        id: 1,
        title: 'Increase Sales by 10%',
        type: 'performance',
        description: 'Grow monthly sales by focusing on new leads.',
        deadline: '2025-09-30',
        alignment: ['Increase Company Revenue'],
        assignees: [dummyReports[0], dummyReports[1]],
    },
    {
        id: 2,
        title: 'Launch New App Feature',
        type: 'development',
        description: 'Release the dashboard redesign by end of Q3.',
        deadline: '2025-08-15',
        alignment: ['Launch New Product'],
        assignees: [dummyReports[2]],
    },
];

export default function GoalsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [quarter, setQuarter] = useState(quarterOptions[1]);
    const [department, setDepartment] = useState(deptOptions[0]);
    const [location, setLocation] = useState(locationOptions[0]);
    const [form, setForm] = useState({
        fromTemplate: null,              // ← new field!
        title: '',
        description: '',
        deadline: '',
        type: '',
        alignment: [],
        assignees: [],
        measureType: '',                 // 'numeric' | 'monetary' | 'qualitative'
        measureValue: '',
        measureCurrency: '',
    });
    const [goals, setGoals] = useState(initialGoals);
    const [editingId, setEditingId] = useState(null);

    // Dark‐mode persistence…
    useEffect(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) setDarkMode(saved === 'true');
        else if (window.matchMedia)
            setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }, []);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    const handleChange = (field) => (e, maybe) => {
        const val = e?.target !== undefined ? e.target.value : maybe;
        setForm((f) => ({ ...f, [field]: val }));
    };

    const handleSave = () => {
        const newGoal = { ...form, id: editingId || Date.now() };
        if (editingId) {
            setGoals((gs) => gs.map((g) => (g.id === editingId ? newGoal : g)));
        } else {
            setGoals((gs) => [...gs, newGoal]);
        }
        setEditingId(null);
        setShowForm(false);
        setForm({
            fromTemplate: null, title: '', description: '', deadline: '',
            type: '', alignment: [], assignees: [],
            measureType: '', measureValue: '', measureCurrency: ''
        });
    };

    const handleEdit = (g) => {
        setForm({
            fromTemplate: null,
            title: g.title,
            description: g.description,
            deadline: g.deadline,
            type: g.type,
            alignment: g.alignment,
            assignees: g.assignees,
            measureType: g.measureType || '',
            measureValue: g.measureValue || '',
            measureCurrency: g.measureCurrency || ''
        });
        setEditingId(g.id);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setGoals((gs) => gs.filter((g) => g.id !== id));
        if (editingId === id) {
            setEditingId(null);
            setShowForm(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden  dark:bg-gray-900 text-gray-800 dark:text-gray-100">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex flex-col flex-1">
                <TopBar
                    onMenuClick={() => setSidebarOpen((o) => !o)}
                    darkMode={darkMode}
                    onToggleDark={() => setDarkMode((m) => !m)}
                />

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 
                                        group-hover:ml-64 transition-margin duration-200">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Goals overview for May 4, 2025</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-wrap gap-6 items-center">
                        <select value={quarter} onChange={e => setQuarter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {quarterOptions.map(q => <option key={q}>{q}</option>)}
                        </select>
                        <select value={department} onChange={e => setDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {deptOptions.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select value={location} onChange={e => setLocation(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {locationOptions.map(l => <option key={l}>{l}</option>)}
                        </select>
                        {/* <button className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            <Plus className="w-4 h-4" /> Add Widget
                        </button> */}
                    </div>
                </div>

                <main className="
          flex-1
          ml-20                          /* collapsed sidebar width */
          mt-4
          mr-4
          mb-4
          transition-margin duration-200
          group-hover:ml-64              /* expanded sidebar width */
          px-0
          overflow-auto
        ">
                    <Card
                        sx={{
                            borderRadius: 4,
                            boxShadow: '0 4px 32px rgba(33,122,244,0.08)',
                            bgcolor: 'background.paper',
                            maxWidth: 1200,
                            mx: 'auto',
                            mt: 2,
                            mb: 6,
                            p: 1,
                            border: '1.5px solid #e0e7ef'
                        }}
                    >
                        <CardContent>
                            {/* ─── Header Toggle ─────────────────────────────────────────── */}
                            <Box
                                display="flex"
                                alignItems="center"
                                mb={2}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => setShowForm((f) => !f)}
                            >
                                <Plus style={{
                                    // backgroundColor: '#e0f0ff',
                                    color: '#2186eb',
                                    padding: '6px',       // adds “touch target” size
                                    borderRadius: '50px',       // round the corners
                                    width: 28,
                                    height: 28,
                                    marginRight: 10,
                                    cursor: 'pointer',   // makes it feel clickable
                                }} />
                                <Typography variant="h7" fontWeight={700} color="#2186eb">
                                    {showForm ? (editingId ? 'Edit Goal' : 'Add New Goal') : 'Add New Goal'}
                                </Typography>
                                <IconButton size="small" sx={{ ml: 'auto', color: '#2186eb' }}>
                                    {showForm
                                        ? <Minus style={{
                                            backgroundColor: '#e0f0ff',
                                            color: '#2186eb',
                                            padding: '6px',       // adds “touch target” size
                                            borderRadius: '50px',       // round the corners
                                            width: 28,
                                            height: 28,
                                            // marginRight: 10,
                                            cursor: 'pointer',   // makes it feel clickable
                                        }} />
                                        : <Plus style={{
                                            backgroundColor: '#e0f0ff',
                                            color: '#2186eb',
                                            padding: '6px',       // adds “touch target” size
                                            borderRadius: '50px',       // round the corners
                                            width: 28,
                                            height: 28,
                                            // marginRight: 10,
                                            cursor: 'pointer',   // makes it feel clickable
                                        }} />}
                                </IconButton>
                            </Box>
                            {/* ─── Form Section ──────────────────────────────────────────────────────────────── */}
                            {showForm && (
                                <>
                                    <Typography variant="subtitle2" color="text.secondary" mb={2}>
                                        Enter clear, actionable details for your goal.
                                    </Typography>

                                    <Box>
                                        <Grid container spacing={3}>

                                            {/* 0) TEMPLATE PICKER */}
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    options={templateGoals}
                                                    getOptionLabel={t => t.title}
                                                    value={templateGoals.find(t => t.id === form.fromTemplate) || null}
                                                    onChange={(_, tmpl) => {
                                                        if (!tmpl) {
                                                            setForm(f => ({
                                                                ...f,
                                                                fromTemplate: null,
                                                                measureType: '',
                                                                measureCurrency: '',
                                                                measureValue: '',
                                                            }));
                                                            return;
                                                        }
                                                        setForm(f => ({
                                                            ...f,
                                                            fromTemplate: tmpl.id,
                                                            measureType: tmpl.type === 'monetary'
                                                                ? 'monetary'
                                                                : tmpl.type === 'count'
                                                                    ? 'numeric'
                                                                    : 'qualitative',
                                                            measureCurrency: tmpl.type === 'monetary' ? currencies[0] : '',
                                                            // pre-fill measureValue based on template and add field for measurementFrequency - weekly, monthly, quarterly
                                                            measureValue: tmpl.measureValue || '',
                                                        }));
                                                    }}
                                                    renderInput={params => (
                                                        <TextField
                                                            {...params}
                                                            label="Choose a template"
                                                            placeholder="Search templates"
                                                            fullWidth
                                                        />
                                                    )}
                                                />
                                            </Grid>

                                            {/* 1) TITLE */}
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <TextField
                                                    label="Goal Title"
                                                    value={form.title}
                                                    onChange={handleChange('title')}
                                                    fullWidth
                                                />
                                            </Grid>

                                            {/* 2) GOAL TYPE */}
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Goal Type</InputLabel>
                                                    <Select
                                                        label="Goal Type"
                                                        value={form.type}
                                                        onChange={handleChange('type')}
                                                    >
                                                        {goalTypes.map(g => (
                                                            <MenuItem key={g.id} value={g.id}>{g.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* 3) DEADLINE */}
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <TextField
                                                    label="Deadline"
                                                    type="date"
                                                    InputLabelProps={{ shrink: true }}
                                                    value={form.deadline}
                                                    onChange={handleChange('deadline')}
                                                    fullWidth
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                <CalendarToday />
                                                            </InputAdornment>
                                                        )
                                                    }}
                                                />
                                            </Grid>

                                            {/* 4) MEASURE TYPE */}
                                            <Grid size={{ xs: 12, md: 4 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel>Measure Type</InputLabel>
                                                    <Select
                                                        label="Measure Type"
                                                        value={form.measureType}
                                                        onChange={handleChange('measureType')}
                                                    >
                                                        <MenuItem value="numeric">Numeric</MenuItem>
                                                        <MenuItem value="monetary">Monetary</MenuItem>
                                                        <MenuItem value="qualitative">Qualitative</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* 5) CONDITIONAL: VALUE or CURRENCY */}
                                            {form.measureType === 'numeric' && (
                                                <Grid container spacing={2} sx={{ width: '100%', ml: 0 }}>
                                                    <Grid size={{ xs: 4, md: 4 }}>
                                                        <TextField
                                                            type="number"
                                                            label="Number Value"
                                                            value={form.measureValue}
                                                            onChange={handleChange('measureValue')}
                                                            fullWidth
                                                        />
                                                    </Grid>
                                                    {/* Unit of measurement */}
                                                    <Grid size={{ xs: 4, md: 4 }}>
                                                        <FormControl fullWidth>
                                                            <InputLabel>Unit of Measurement</InputLabel>
                                                            <Select
                                                                label="Unit of Measurement"
                                                                value={form.measureUnit || ''}
                                                                onChange={handleChange('measureUnit')}
                                                            >
                                                                {measurementUnits.map(unit => (
                                                                    <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid size={{ xs: 4, md: 4 }}>
                                                        <FormControl fullWidth>
                                                            <InputLabel>Measurement Frequency</InputLabel>
                                                            <Select
                                                                label="Measurement Frequency"
                                                                value={form.measureFrequency || ''}
                                                                onChange={handleChange('measureFrequency')}
                                                            >
                                                                <MenuItem value="weekly">Weekly</MenuItem>
                                                                <MenuItem value="monthly">Monthly</MenuItem>
                                                                <MenuItem value="quarterly">Quarterly</MenuItem>
                                                                <MenuItem value="yearly">Yearly</MenuItem>
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                </Grid>
                                            )}
                                            {form.measureType === 'monetary' && (
                                                <>
                                                    <Grid size={{ xs: 12, md: 4 }}>
                                                        <FormControl fullWidth>
                                                            <InputLabel>Currency</InputLabel>
                                                            <Select
                                                                label="Currency"
                                                                value={form.measureCurrency}
                                                                onChange={handleChange('measureCurrency')}
                                                            >
                                                                {currencies.map(c => (
                                                                    <MenuItem key={c} value={c}>{c}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, md: 4 }}>
                                                        <TextField
                                                            type="number"
                                                            label="Amount"
                                                            value={form.measureValue}
                                                            onChange={handleChange('measureValue')}
                                                            fullWidth
                                                        />
                                                    </Grid>
                                                </>
                                            )}
                                            {form.measureType === 'qualitative' && (
                                                <Grid size={{ xs: 12, md: 12 }}>
                                                    <TextField
                                                        label="Qualitative Criteria"
                                                        value={form.measureValue}
                                                        onChange={handleChange('measureValue')}
                                                        fullWidth
                                                        multiline
                                                        minRows={3}
                                                    />
                                                </Grid>
                                            )}
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    multiple
                                                    options={higherGoals}
                                                    freeSolo
                                                    value={form.alignment}
                                                    onChange={(_, v) => setForm(f => ({ ...f, alignment: v }))}
                                                    renderInput={params => (
                                                        <TextField
                                                            {...params}
                                                            label="Align to Objectives"
                                                            placeholder="Type or select"
                                                            helperText="(Optional)"
                                                            fullWidth
                                                        />
                                                    )}
                                                />
                                            </Grid>

                                            {/* 7) ASSIGNEES */}
                                            <Grid size={{ xs: 12, md: 6 }}>
                                                <Autocomplete
                                                    multiple
                                                    options={dummyReports}
                                                    getOptionLabel={o => o.label}
                                                    value={form.assignees}
                                                    onChange={(_, v) => setForm(f => ({ ...f, assignees: v }))}
                                                    renderInput={params => (
                                                        <TextField
                                                            {...params}
                                                            label="Assign to"
                                                            placeholder="Team members"
                                                            helperText="Select one or more"
                                                            fullWidth
                                                        />
                                                    )}
                                                />
                                            </Grid>

                                            {/* 8) DESCRIPTION (full width) */}
                                            <Grid size={{ xs: 12, md: 12 }}>
                                                <TextField
                                                    label="Description"
                                                    value={form.description}
                                                    onChange={handleChange('description')}
                                                    fullWidth
                                                    multiline
                                                    minRows={3}
                                                />
                                            </Grid>

                                            {/* 9) ACTIONS */}
                                            <Grid size={{ xs: 12, md: 12 }} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
                                                <Button
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setEditingId(null);
                                                        setShowForm(false);
                                                    }}
                                                    sx={{ mr: 2 }}
                                                >
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


                            {/* ─── Existing Goals Table ───────────────────────────────────── */}
                            <Typography variant="h6" fontWeight={600} mb={2}>
                                Existing Goals
                            </Typography>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Goal</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Deadline</TableCell>
                                        <TableCell>Aligns To</TableCell>
                                        <TableCell>Assignees</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {goals.map((g) => (
                                        <TableRow key={g.id} hover>
                                            <TableCell>
                                                <Typography fontWeight={600}>{g.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {g.description}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {goalTypes.find((t) => t.id === g.type)?.label}
                                            </TableCell>
                                            <TableCell>{g.deadline}</TableCell>
                                            <TableCell>
                                                {g.alignment.map((a) => (
                                                    <Chip
                                                        key={a}
                                                        label={a}
                                                        size="small"
                                                        sx={{ mr: 0.5, borderRadius: 2 }}
                                                    />
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                {g.assignees.map((u) => (
                                                    <Chip
                                                        key={u.id}
                                                        label={u.label}
                                                        size="small"
                                                        sx={{ mr: 0.5, borderRadius: 2 }}
                                                    />
                                                ))}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="Edit Goal">
                                                    <IconButton
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => handleEdit(g)}
                                                    >
                                                        <Edit />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Goal">
                                                    <IconButton
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDelete(g.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {goals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    No goals added yet.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* ─── Footer ─────────────────────────────────────────────────── */}
                            <Box mt={4} sx={{ textAlign: 'center' }}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    onClick={() => (window.location.href = '/dashboard')}
                                    sx={{
                                        borderRadius: 24,
                                        px: 4,
                                        py: 1.5,
                                        fontSize: 18,
                                        fontWeight: 600,
                                        boxShadow: '0 2px 12px rgba(33,134,235,0.16)',
                                    }}
                                >
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

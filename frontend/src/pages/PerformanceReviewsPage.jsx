// src/pages/PerformanceReviewsPage.jsx
import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Tabs,
    Tab,
    Paper,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Stack,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import ChatIcon from '@mui/icons-material/Chat';
import { Add, Edit, Delete } from '@mui/icons-material';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import { Plus } from 'lucide-react';

const dummyEmployees = ['Alice Johnson', 'Bob Smith', 'Carol Lee'];

const initialReviews = [
    {
        id: 1,
        employee: 'Alice Johnson',
        date: '2024-12-20',
        status: 'Upcoming',
        selfAssessment: '',
        managerComments: '',
    },
    {
        id: 2,
        employee: 'Bob Smith',
        date: '2024-11-15',
        status: 'Completed',
        selfAssessment: 'Met most targets',
        managerComments: 'Good improvement',
    },
];

const initial1on1s = [
    { id: 1, employee: 'Alice Johnson', date: '2024-12-01', notes: 'Discussed Q4 targets' },
    { id: 2, employee: 'Carol Lee', date: '2024-11-20', notes: 'Career development' },
];

// Filter options
const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const deptOptions = ['All Departments', 'Sales', 'IT', 'Operations'];
const locationOptions = ['All Locations', 'Ghana', 'Nigeria', 'Rest of the World'];

export default function PerformanceReviewsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    const [quarter, setQuarter] = useState(quarterOptions[1]);
    const [department, setDepartment] = useState(deptOptions[0]);
    const [location, setLocation] = useState(locationOptions[0]);

    const [tab, setTab] = useState(0);
    const [reviews, setReviews] = useState(initialReviews);
    const [ones, setOnes] = useState(initial1on1s);

    // filters
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    // dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [form, setForm] = useState({
        id: null,
        type: 'review',
        employee: '',
        date: '',
        status: 'Upcoming',
        selfAssessment: '',
        managerComments: '',
        notes: '',
    });

    // sync theme with html.dark using provided CSS tokens
    useEffect(() => {
        const saved = localStorage.getItem('theme');
        if (saved) {
            const isDark = saved === 'dark';
            setDarkMode(isDark);
            document.documentElement.classList.toggle('dark', isDark);
        } else {
            // honor system as a default
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
            setDarkMode(prefersDark);
            document.documentElement.classList.toggle('dark', prefersDark);
        }
    }, []);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    // filtered data
    const filteredReviews = useMemo(() => {
        return reviews.filter(r => {
            if (statusFilter !== 'All' && r.status !== statusFilter) return false;
            if (dateRange.from && r.date < dateRange.from) return false;
            if (dateRange.to && r.date > dateRange.to) return false;
            return true;
        });
    }, [reviews, statusFilter, dateRange]);

    const handleOpen = (item = null) => {
        if (tab === 0) {
            // review
            setForm({
                id: item?.id || null,
                type: 'review',
                employee: item?.employee || '',
                date: item?.date || '',
                status: item?.status || 'Upcoming',
                selfAssessment: item?.selfAssessment || '',
                managerComments: item?.managerComments || '',
            });
        } else {
            // 1on1
            setForm({
                id: item?.id || null,
                type: '1to1',
                employee: item?.employee || '',
                date: item?.date || '',
                notes: item?.notes || '',
            });
        }
        setDialogOpen(true);
    };

    const handleSave = () => {
        if (form.type === 'review') {
            const updated = {
                id: form.id || Date.now(),
                employee: form.employee,
                date: form.date,
                status: form.status,
                selfAssessment: form.selfAssessment,
                managerComments: form.managerComments,
            };
            setReviews(rs =>
                form.id
                    ? rs.map(r => (r.id === form.id ? updated : r))
                    : [...rs, updated]
            );
        } else {
            const updated = {
                id: form.id || Date.now(),
                employee: form.employee,
                date: form.date,
                notes: form.notes,
            };
            setOnes(os =>
                form.id
                    ? os.map(o => (o.id === form.id ? updated : o))
                    : [...os, updated]
            );
        }
        setDialogOpen(false);
    };

    const handleDelete = id => {
        if (tab === 0) setReviews(rs => rs.filter(r => r.id !== id));
        else setOnes(os => os.filter(o => o.id !== id));
    };

    return (
        <div className="flex flex-col h-screen bg-[var(--bg)] text-[var(--fg)]">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <TopBar
                onMenuClick={() => setSidebarOpen(o => !o)}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(m => !m)}
            />

            {/* Filter Bar */}
            <div className="toolbar sticky top-14 z-10 shadow ml-16 px-6 py-4 transition-margin duration-200">
                <div className="flex flex-col md:flex-row items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Performance Reviews</h1>
                        <p className="text-sm muted">Performance Review for May 4, 2025</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-wrap gap-6 items-center">
                        <select
                            value={quarter}
                            onChange={e => setQuarter(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] focus:outline-none"
                        >
                            {quarterOptions.map(q => <option key={q}>{q}</option>)}
                        </select>
                        <select
                            value={department}
                            onChange={e => setDepartment(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] focus:outline-none"
                        >
                            {deptOptions.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] focus:outline-none"
                        >
                            {locationOptions.map(l => <option key={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <main
                className="
          flex-1
          ml-20
          mt-4
          mr-4
          mb-4
          transition-margin duration-200
          px-0
          overflow-auto
        "
            >
                <div className="flex flex-col h-full card p-6">
                    <Box px={4} py={2} overflow="auto">
                        <Paper
                            elevation={0}
                            sx={{
                                backgroundColor: 'var(--surface)',
                                color: 'var(--fg)',
                                border: '1px solid var(--border)',
                                borderRadius: 2,
                            }}
                        >
                            <Tabs
                                value={tab}
                                onChange={(_, v) => setTab(v)}
                                variant="fullWidth"
                                textColor="inherit"
                                TabIndicatorProps={{ style: { backgroundColor: 'var(--accent)', height: 4, borderRadius: 2 } }}
                                sx={{
                                    '& .MuiTab-root': {
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        px: 2,
                                        minHeight: 'auto',
                                        mx: 0.5,
                                        transition: 'background 0.2s',
                                        color: 'var(--fg)',
                                    },
                                    '& .MuiTab-root.Mui-selected': {
                                        color: 'var(--accent)',
                                    },
                                }}
                            >
                                <Tab
                                    icon={<AssessmentIcon />}
                                    iconPosition="start"
                                    label="Performance Reviews"
                                />
                                <Tab
                                    icon={<ChatIcon />}
                                    iconPosition="start"
                                    label="1-on-1s"
                                />
                            </Tabs>
                        </Paper>

                        <Stack direction="row" alignItems="center" justifyContent="space-between" mt={2}>
                            <Typography variant="h6">
                                {tab === 0 ? 'Reviews' : '1-on-1s'}
                            </Typography>
                            <Button
                                startIcon={<Add />}
                                variant="contained"
                                onClick={() => handleOpen()}
                                disableElevation
                                sx={{
                                    textTransform: 'none',
                                    ml: 2,
                                    bgcolor: 'var(--accent)',
                                    color: '#fff',
                                    '&:hover': { filter: 'brightness(0.95)', bgcolor: 'var(--accent)' },
                                }}
                            >
                                Schedule {tab === 0 ? 'Review' : '1-on-1'}
                            </Button>
                        </Stack>

                        {/* Filters (for Reviews tab) */}
                        {tab === 0 && (
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2} alignItems="center">
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        label="Status"
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                        }}
                                    >
                                        {['All', 'Upcoming', 'Completed'].map(s => (
                                            <MenuItem key={s} value={s}>{s}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="From"
                                    type="date"
                                    size="small"
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    value={dateRange.from}
                                    onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                    }}
                                />
                                <TextField
                                    label="To"
                                    type="date"
                                    size="small"
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    value={dateRange.to}
                                    onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                    }}
                                />
                            </Stack>
                        )}

                        {/* Table */}
                        <Box mt={2}>
                            <Table
                                sx={{
                                    '& th, & td': { borderColor: 'var(--border)', color: 'var(--fg)' },
                                }}
                            >
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Employee</TableCell>
                                        <TableCell>Date</TableCell>
                                        {tab === 0
                                            ? <TableCell>Status</TableCell>
                                            : <TableCell>Notes</TableCell>
                                        }
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(tab === 0 ? filteredReviews : ones).map(item => (
                                        <TableRow key={item.id} hover>
                                            <TableCell>{item.employee}</TableCell>
                                            <TableCell>{item.date}</TableCell>
                                            {tab === 0
                                                ? <TableCell>{item.status}</TableCell>
                                                : <TableCell>{item.notes}</TableCell>
                                            }
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={() => handleOpen(item)} sx={{ color: 'var(--fg)' }}>
                                                    <Edit fontSize="inherit" />
                                                </IconButton>
                                                <IconButton size="small" onClick={() => handleDelete(item.id)} sx={{ color: 'var(--fg)' }}>
                                                    <Delete fontSize="inherit" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Box>
                </div>
            </main>

            {/* Schedule / Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        backgroundColor: 'var(--card)',
                        color: 'var(--fg)',
                        border: '1px solid var(--border)',
                    },
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid var(--border)' }}>
                    {form.type === 'review'
                        ? form.id ? 'Edit Review' : 'Schedule Review'
                        : form.id ? 'Edit 1 on 1' : 'Schedule 1 on 1'}
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: 'var(--border)' }}>
                    <FormControl fullWidth margin="normal" size="small">
                        <InputLabel>Employee</InputLabel>
                        <Select
                            label="Employee"
                            value={form.employee}
                            onChange={e => setForm(f => ({ ...f, employee: e.target.value }))}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                            }}
                        >
                            {dummyEmployees.map(e => (
                                <MenuItem key={e} value={e}>{e}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        margin="normal"
                        label="Date"
                        type="date"
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={form.date}
                        onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                        sx={{
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                        }}
                    />

                    {form.type === 'review' && (
                        <>
                            <FormControl fullWidth margin="normal" size="small">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    label="Status"
                                    value={form.status}
                                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    sx={{
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                    }}
                                >
                                    {['Upcoming', 'Completed'].map(s => (
                                        <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                margin="normal"
                                label="Self‐Assessment"
                                fullWidth
                                multiline
                                minRows={3}
                                size="small"
                                value={form.selfAssessment}
                                onChange={e => setForm(f => ({ ...f, selfAssessment: e.target.value }))}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                }}
                            />

                            <TextField
                                margin="normal"
                                label="Manager Comments"
                                fullWidth
                                multiline
                                minRows={3}
                                size="small"
                                value={form.managerComments}
                                onChange={e => setForm(f => ({ ...f, managerComments: e.target.value }))}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                }}
                            />
                        </>
                    )}

                    {form.type === '1to1' && (
                        <TextField
                            margin="normal"
                            label="Notes / Agenda"
                            fullWidth
                            multiline
                            minRows={3}
                            size="small"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            sx={{
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border)' },
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid var(--border)' }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disableElevation
                        sx={{
                            bgcolor: 'var(--accent)',
                            color: '#fff',
                            '&:hover': { filter: 'brightness(0.95)', bgcolor: 'var(--accent)' },
                        }}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

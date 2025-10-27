// frontend/src/pages/ManagerReviewsPage.jsx
import React, {useEffect, useMemo, useState, useCallback, useRef} from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Divider,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Stack,
  Avatar,
  TextField,
  Rating,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";
import {
  Save,
  History,
  Refresh,
  CheckCircle,
  ArrowForward,
} from "@mui/icons-material";
import {format} from "date-fns";
import {supabase} from "@/lib/supabaseClient";
import {useOrg} from "@/context/OrgContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import {ThemeProvider, createTheme, alpha} from "@mui/material/styles";
import {
  buildQuarterCycles,
  displayCycleLabel,
  normalizeCycle,
} from "@/utils/cycles";

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────
const cardCls = {
  borderRadius: "16px",
  border: "1px solid var(--card-border, rgba(0,0,0,0.06))",
  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  backgroundColor: "var(--card)", // ⬅️ use the token you have
  color: "var(--fg)",
};

// put near other small helpers
function pctToTarget(current = 0, target = 0) {
  const c = Number(current || 0);
  const t = Number(target || 0);
  if (!t || t <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((c / t) * 100)));
}

const sectionTitle = (t) => (
  <Typography
    variant="subtitle2"
    sx={{
      color: "text.secondary",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      mb: 1,
    }}
  >
    {t}
  </Typography>
);

// ---------- MUI theme that reads your CSS vars ----------
// ---------- MUI theme that reads your CSS vars ----------
function useMuiTheme(darkMode) {
  const light = {
    bg: "#f8fafc",
    card: "#ffffff",
    surface: "#f1f5f9",
    fg: "#0f172a",
    fgMuted: "#64748b",
    border: "rgba(15, 23, 42, 0.12)",
    accent: "#2563eb",
  };
  const dark = {
    bg: "#0b1220",
    card: "#0f172a",
    surface: "#111826",
    fg: "#e5e7eb",
    fgMuted: "#9aa4b2",
    border: "rgba(148, 163, 184, 0.24)",
    accent: "#60a5fa",
  };
  const t = darkMode ? dark : light;

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      // IMPORTANT: literal colors here, not CSS variables
      primary: {main: t.accent},
      secondary: {main: t.fgMuted},
      background: {default: t.bg, paper: t.card},
      text: {primary: t.fg, secondary: t.fgMuted},
      divider: t.border,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          :root { color-scheme: ${darkMode ? "dark" : "light"}; }
          /* tokens still drive the app via CSS vars */
          body {
            background: var(--bg, ${t.bg});
            color: var(--fg, ${t.fg});
          }
          * { scrollbar-color: var(--border, ${t.border}) transparent; }
          *::-webkit-scrollbar { height: 10px; width: 10px; }
          *::-webkit-scrollbar-thumb {
            background: color-mix(in oklab, var(--border, ${
              t.border
            }) 85%, transparent);
            border-radius: 8px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
        `,
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--card)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--card)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(2,6,23,0.12)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {color: "var(--fg)", borderColor: "var(--border)"},
          head: {
            color: "var(--fg)",
            backgroundColor:
              "color-mix(in oklab, var(--card) 90%, transparent)",
            fontWeight: 700,
            letterSpacing: 0.2,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: "var(--surface)",
            "& fieldset": {borderColor: "var(--border)"},
            "&:hover fieldset": {
              borderColor: "color-mix(in oklab, var(--fg) 28%, transparent)",
            },
            "&.Mui-focused fieldset": {borderColor: "var(--accent)"},
          },
          input: {color: "var(--fg)"},
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {backgroundColor: "var(--surface)", color: "var(--fg)"},
          icon: {color: "var(--fg-muted)"},
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            backgroundColor:
              "color-mix(in oklab, var(--surface) 85%, transparent)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            borderRadius: 999,
          },
          outlined: {borderColor: "var(--border)"},
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            // alpha() only used on a literal color => safe
            backgroundColor: alpha("#000", darkMode ? 0.8 : 0.75),
            color: "#fff",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {textTransform: "none", borderRadius: 12},
          containedPrimary: {color: "#fff"},
          outlined: {borderColor: "var(--border)", color: "var(--fg)"},
        },
      },
      MuiDivider: {
        styleOverrides: {root: {borderColor: "var(--border)"}},
      },
    },
    typography: {fontSize: 13, h6: {letterSpacing: 0.2}},
  });

  return theme;
}
// Debounced callback without violating hook rules
function useDebouncedCallback(fn, delay = 700) {
  const fnRef = useRef(fn);
  const timerRef = useRef(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, delay);
    },
    [delay]
  );

  // optional: cancel on unmount
  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({run: debounced, cancel}), [debounced, cancel]);
}

// ─────────────────────────────────────────────────────────────────────────────
// API wrappers (RPCs you’ll add below in SQL section)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchManagedEmployees(orgId) {
  const {data, error} = await supabase.rpc(
    "list_managed_employees_with_review_status",
    {p_org_id: orgId}
  );
  if (error) throw error;
  return data || [];
}

async function fetchPastReviews(orgId) {
  const {data, error} = await supabase.rpc("list_manager_past_reviews", {
    p_org_id: orgId,
  });
  if (error) throw error;
  return data || [];
}

// Map your cycleId to a quarter label the RPC expects
function cycleIdToQuarterLabel(cycleId) {
  if (!cycleId || cycleId === "current") return null; // server treats NULL as "no filter / latest"
  // accept forms like 'q4_2025' or 'Q4 2025'
  if (/^q[1-4]_\d{4}$/i.test(cycleId)) {
    const [q, y] = cycleId.split("_");
    return `${
      q.toUpperCase().replace("Q", "Q") + q.slice(1).toUpperCase().slice(1)
    } ${y}`; // safer: build below
  }
  if (/^Q[1-4]\s+\d{4}$/.test(cycleId)) return cycleId; // already good
  // fallback: mid-year custom label → treat as null so we don't hide goals
  return null;
}

async function fetchEmployeeGoalsForCycle(orgId, employeeId, quarterLabel) {
  const {data, error} = await supabase.schema('public').rpc("employee_goals_for_cycle", {
    p_org_id: orgId,
    p_employee_id: employeeId,
    p_quarter: quarterLabel ?? null,
  });
  if (error) throw error;
  return (data || []).map((g) => ({
    goal_id: g.goal_id,
    title: g.title,
    unit: g.unit ?? "",
    measure_type: g.measure_type ?? "numeric",
    target: Number(g.target ?? 0),
    start_value: Number(g.start_value ?? 0),
    current_value: Number(g.current_value ?? 0), // ✅ latest measurement for numeric/monetary
    progress_pct: Number(g.progress_pct ?? 0), // ✅ server-side computed
    deadline: g.deadline ?? null,
    org_goal_id: g.org_goal_id ?? null,
    org_goal_label: g.org_goal_label ?? null,
    qual_status: g.qual_status ?? null, // ✅ for qualitative
    rating: g.rating ?? null, // you can merge server ratings if you add them
    comment: g.comment ?? "",
  }));
}

// Save summary draft helper (adjust to your SQL function name/signature)
async function saveSummary({
  orgId,
  employeeId,
  cycleId,
  strengths,
  improvements,
  summary,
  recommendation,
}) {
  const {error} = await supabase.rpc("save_manager_review_summary", {
    p_org_id: orgId,
    p_employee_id: employeeId,
    p_cycle_id: cycleId,
    p_strengths: strengths ?? null,
    p_improvements: improvements ?? null,
    p_summary: summary ?? null,
    p_recommendation: recommendation ?? null,
  });
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeList({rows, selectedId, onSelect, onRefresh}) {
  return (
    <Card
      sx={{
        ...cardCls,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 320,
      }}
    >
      <CardHeader
        title="Your Team"
        action={
          <IconButton onClick={onRefresh} size="small">
            <Refresh />
          </IconButton>
        }
        sx={{pb: 1}}
      />
      <CardContent sx={{pt: 0, overflow: "auto"}}>
        <List dense>
          {rows.map((r) => (
            <ListItem key={r.employee_id} disablePadding>
              <ListItemButton
                selected={selectedId === r.employee_id}
                onClick={() => onSelect(r)}
              >
                <ListItemAvatar>
                  <Avatar src={r.avatar_url || undefined}>{r.initials}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {r.full_name}
                      </Typography>
                      <div className="flex items-center gap-1 dark:text-gray-300">
                        {r.review_status === "completed" && (
                          <Chip
                            size="small"
                            color="success"
                            label="Done"
                            variant="outlined"
                          />
                        )}
                        {r.review_status === "in_progress" && (
                          <Chip
                            size="small"
                            color="primary"
                            label="In progress"
                            variant="outlined"
                          />
                        )}
                        {r.review_status === "pending" && (
                          <Chip
                            size="small"
                            variant="outlined"
                            label="Pending"
                          />
                        )}
                      </div>
                    </Stack>
                  }
                  secondary={`${r.role ?? ""} ${
                    r.department ? "• " + r.department : ""
                  }`}
                />
                <ArrowForward fontSize="small" />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

function CompetencyCard({item, onChange}) {
  const [local, setLocal] = useState({
    rating: item.rating ?? 0,
    comment: item.comment ?? "",
  });

  // Debounce ONLY comment; rating can persist immediately
  const debouncedComment = useDebouncedCallback(
    (v) => onChange({...item, rating: local.rating, comment: v}),
    600
  );

  useEffect(() => {
    // keep local in sync if parent refreshes workspace
    setLocal({rating: item.rating ?? 0, comment: item.comment ?? ""});
  }, [item.rating, item.comment]);

  return (
    <Card sx={{...cardCls, mb: 2}}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="subtitle1" fontWeight={600}>
            {item.name}
          </Typography>
          <Tooltip title={item.scale_help || "1=Below, 3=Meets, 5=Exceeds"}>
            <Rating
              value={local.rating}
              onChange={(_, v) => {
                const val = v ?? 0;
                setLocal((s) => ({...s, rating: val}));
                onChange({...item, rating: val, comment: local.comment});
              }}
              sx={{"& .MuiRating-icon": {fontSize: 24}}}
            />
          </Tooltip>
        </Stack>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Add a brief comment (optional)"
          value={local.comment}
          onChange={(e) => {
            const v = e.target.value;
            setLocal((s) => ({...s, comment: v}));
            debouncedComment.run(v);
          }}
          sx={{mt: 1}}
        />
      </CardContent>
    </Card>
  );
}



function GoalCard({ item, onChange, ownerId }) {
  const [local, setLocal] = useState({
    rating: item.rating ?? 0,
    comment: item.comment ?? "",
  });

  const debouncedComment = useDebouncedCallback(
    (v) => onChange({ ...item, rating: local.rating, comment: v }),
    600
  );

  useEffect(() => {
    setLocal({ rating: item.rating ?? 0, comment: item.comment ?? "" });
  }, [ownerId, item.goal_id, item.rating, item.comment]); // ⬅️ include owner

  const isQual = item.measure_type === "qualitative";

  return (
    <Card sx={{...cardCls, mb: 2}}>
      <CardContent>
        {sectionTitle("Goal")}
        <Typography fontWeight={600} sx={{mb: 0.5}}>
          {item.title}
        </Typography>

        {/* Header row: progress or status */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{mb: 1}}>
          <Box sx={{flex: 1}}>
            {isQual ? (
              <>
                {/* show a status chip and a subtle bar from progress_pct mapping */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{mb: 0.5}}
                >
                  <Chip
                    size="small"
                    label={item.qual_status || "No status"}
                    variant="outlined"
                  />
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(
                    100,
                    Math.max(0, Math.round(item.progress_pct ?? 0))
                  )}
                />
                <Typography variant="caption" color="text.secondary">
                  Status: {item.qual_status || "—"} • Visual progress:{" "}
                  {Math.round(item.progress_pct ?? 0)}%
                </Typography>
              </>
            ) : (
              <>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(
                    100,
                    Math.max(0, Math.round(item.progress_pct ?? 0))
                  )}
                />
                <Typography variant="caption" color="text.secondary">
                  Current: <b>{Number(item.current_value ?? 0)}</b>
                  {item.unit ? ` ${item.unit}` : ""} • Target:{" "}
                  <b>{Number(item.target ?? 0)}</b>
                  {item.unit ? ` ${item.unit}` : ""} • Progress:{" "}
                  {Math.round(item.progress_pct ?? 0)}%
                </Typography>
              </>
            )}
          </Box>

          <Stack alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Rating
            </Typography>
            <Rating
              value={local.rating}
              onChange={(_, v) => {
                const val = v ?? 0;
                setLocal((s) => ({...s, rating: val}));
                onChange({...item, rating: val, comment: local.comment});
              }}
            />
          </Stack>
        </Stack>

        {/* Manager comment (for all types) */}
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder={
            isQual
              ? "Notes for this qualitative goal"
              : "Manager feedback on this goal"
          }
          value={local.comment}
          onChange={(e) => {
            const v = e.target.value;
            setLocal((s) => ({...s, comment: v}));
            debouncedComment.run(v);
          }}
        />
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function ManagerReviewsPage() {
  const {orgId} = useOrg();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const muiTheme = useMuiTheme(darkMode);

  const cycleOptions = React.useMemo(
    () => buildQuarterCycles({yearsBack: 1, yearsForward: 1}),
    []
  );
  // near other state
const [wsLoading, setWsLoading] = useState(false);
const latestReqRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null); // entire row
  const [cycleId, setCycleId] = useState("current"); // could be actual uuid
  const [tab, setTab] = useState(0);
  const [workspace, setWorkspace] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("");

  const loadCatalog = useCallback(async () => {
    const {data, error} = await supabase.rpc("list_competency_catalog", {
      p_category: catalogCategory || null,
      p_query: catalogQuery || null,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    setCatalog(data || []);
  }, [catalogCategory, catalogQuery]);

  // initialize from saved preference once
  useEffect(() => {
    const saved = localStorage.getItem("tt-theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("tt-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("tt-theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    if (showCatalog) loadCatalog();
  }, [showCatalog, loadCatalog]);

  const loadEmployees = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const rows = await fetchManagedEmployees(orgId);
      setEmployees(rows);
      if (!selected && rows.length) setSelected(rows[0]);
    } catch (e) {
      setErr(e.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [orgId, selected]);
const loadWorkspace = useCallback(async () => {
  if (!orgId || !selected?.employee_id) return;

  const myReq = ++latestReqRef.current;
  setWsLoading(true);
  setErr("");

  try {
    const { data, error } = await supabase.rpc("get_review_workspace", {
      p_org_id: orgId,
      p_employee_id: selected.employee_id,
    });
    if (error) throw error;

    const base = { goals: [], competencies: [], ...data };

    const quarterLabel = normalizeCycle(cycleId);
    const employeeGoals = await fetchEmployeeGoalsForCycle(
      orgId,
      selected.employee_id,
      quarterLabel
    );

    // merge ratings/comments from the draft (if present)
    const ratingsById = new Map(
      (base.goals || []).map((g) => [
        g.goal_id,
        { rating: g.rating ?? null, comment: g.comment ?? "" },
      ])
    );
    const mergedGoals = employeeGoals.map((g) => ({
      ...g,
      ...(ratingsById.get(g.goal_id) || {}),
    }));

    // ⬇️ only set if this is still the latest request
    if (latestReqRef.current === myReq) {
      setWorkspace({ ...base, goals: mergedGoals });
    }
  } catch (e) {
    if (latestReqRef.current === myReq) setErr(e.message || "Failed to load workspace");
  } finally {
    if (latestReqRef.current === myReq) setWsLoading(false);
  }
}, [orgId, selected?.employee_id, cycleId]);


  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
  // Clear current view while the new one loads
  setWorkspace(null);
  setStrengths("");
  setImprovements("");
  setSummary("");
  setRecommendation("maintain");
}, [selected?.employee_id, cycleId]);


  const onCompetencyChange = async (updated) => {
    setWorkspace((w) => ({
      ...w,
      competencies: (w.competencies ?? []).map((c) =>
        c.org_competency_id === updated.org_competency_id
          ? {...c, ...updated}
          : c
      ),
    }));
    try {
      await supabase.rpc("upsert_competency_rating", {
        p_org_id: orgId,
        p_employee_id: selected.employee_id,
        p_org_competency_id: updated.org_competency_id,
        p_rating: updated.rating,
        p_comment: updated.comment ?? null,
      });
    } catch (e) {
      setErr(e.message);
    }
  };

  const onGoalChange = async (updated) => {
    setWorkspace((w) => ({
      ...w,
      goals: (w.goals ?? []).map((g) =>
        g.goal_id === updated.goal_id ? {...g, ...updated} : g
      ),
    }));
    try {
      await supabase.rpc("upsert_goal_review", {
        p_org_id: orgId,
        p_employee_id: selected.employee_id,
        p_goal_id: updated.goal_id,
        p_rating: updated.rating,
        p_comment: updated.comment ?? null,
      });
    } catch (e) {
      setErr(e.message);
    }
  };

  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [summary, setSummary] = useState("");
  const [recommendation, setRecommendation] = useState("maintain");

  useEffect(() => {
    if (!workspace?.review_draft) return;
    setStrengths(workspace.review_draft.strengths || "");
    setImprovements(workspace.review_draft.improvements || "");
    setSummary(workspace.review_draft.summary || "");
    setRecommendation(workspace.review_draft.recommendation || "maintain");
  }, [workspace?.review_draft]);

  const debouncedSaveSummary = useDebouncedCallback(async (payload) => {
    await saveSummary(payload);
  }, 700);

  const saveAll = async () => {
    if (!orgId || !selected?.employee_id) return;
    setSaving(true);
    try {
      await saveSummary({
        orgId,
        employeeId: selected.employee_id,
        cycleId,
        strengths,
        improvements,
        summary,
        recommendation,
      });
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  };
  const submitAll = async () => {
    if (!orgId || !selected?.employee_id) return;
    setSaving(true);
    setErr("");
    try {
      const quarterLabel = normalizeCycle(cycleId); // 'Q4 2025' or null
      const fn = quarterLabel
        ? "submit_manager_goal_reviews_quarterly"
        : "submit_manager_goal_reviews";
      await supabase.rpc(fn, {
        p_org_id: orgId,
        p_employee_id: selected.employee_id,
        ...(quarterLabel ? {p_quarter: quarterLabel} : {}),
      });
      await loadEmployees();
      await loadWorkspace();
    } catch (e) {
      setErr(e.message || "Failed to finalize review");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async () => {
    try {
      const rows = await fetchPastReviews(orgId);
      setHistory(rows);
      setShowHistory(true);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    // Apply Tailwind dark mode scope here:
    <div className="flex flex-col h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuClick={() => setSidebarOpen((o) => !o)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((m) => !m)}
      />

      {/* Page header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow ml-16 transition-all duration-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Manager Reviews
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your team's performance reviews
          </p>
        </div>
      </div>

      {/* Content area */}
      <main className="flex-1 overflow-auto p-6 ml-16 transition-all duration-200">
        <Box sx={{p: 2, gap: 2}}>
          {/* Toolbar */}
          <Card sx={{...cardCls, mb: 2, px: 2, py: 1.5}}>
            <Stack
              direction={{xs: "column", sm: "row"}}
              alignItems={{xs: "stretch", sm: "center"}}
              justifyContent="space-between"
              spacing={1.5}
            >
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                flexWrap="wrap"
              >
                <FormControl size="small" sx={{minWidth: 220}}>
                  <InputLabel>Review Cycle</InputLabel>
                  <Select
                    value={cycleId}
                    label="Review Cycle"
                    onChange={(e) => setCycleId(e.target.value)}
                  >
                    {cycleOptions.map((cycle) => (
                      <MenuItem key={cycle} value={cycle}>
                        {displayCycleLabel(cycle)}
                        
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Chip
                  size="small"
                  variant="outlined"
                  color={selected ? "primary" : "default"}
                  label={
                    selected
                      ? `Selected: ${selected.full_name}`
                      : "No employee selected"
                  }
                />
                <Typography variant="caption" color="text.secondary">
                  Changes auto-save as you type
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center">
                {tab === 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowCatalog(true)}
                  >
                    Add/Edit Competencies
                  </Button>
                )}
                <Tooltip title="Refresh team list">
                  <span>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<Refresh />}
                      onClick={loadEmployees}
                      disabled={loading}
                    >
                      Refresh
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<History />}
                  onClick={openHistory}
                >
                  Past Reviews
                </Button>
              </Stack>
            </Stack>
          </Card>

          {err && (
            <Alert severity="error" sx={{mb: 2}}>
              {err}
            </Alert>
          )}

          {/* Two-column responsive layout:
              md+ => 360px left, remaining space right
              xs    => stacked */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {xs: "1fr", md: "360px 1fr"},
              gap: 4,
              alignItems: "start",
            }}
          >
            {/* Left: Employee list */}
            <Box sx={{minWidth: 0}}>
              <EmployeeList
                rows={employees}
                selectedId={selected?.employee_id}
onSelect={(r) =>
  setSelected((prev) => (prev?.employee_id === r.employee_id ? prev : r))
}
                onRefresh={loadEmployees}
              />
            </Box>

            {/* Right: Workspace fills remaining space */}
            <Box sx={{ minWidth: 0 }} key={`${selected?.employee_id || 'none'}-${cycleId}`}>
  <Card sx={{ ...cardCls }}>
                <CardHeader
                  title={selected ? selected.full_name : "Select an employee"}
                  subheader={
                    selected
                      ? `${selected.role ?? ""} ${
                          selected.department ? "• " + selected.department : ""
                        }`
                      : ""
                  }
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button
                        onClick={saveAll}
                        startIcon={<Save />}
                        disabled={!selected || saving}
                        variant="outlined"
                      >
                        Save
                      </Button>
                      <Button
                        onClick={submitAll}
                        startIcon={<CheckCircle />}
                        disabled={!selected || saving}
                        variant="contained"
                      >
                        Finalize
                      </Button>
                    </Stack>
                  }
                />
                <Divider />

                {wsLoading || !workspace ? (
                  <Box sx={{p: 3}}>
                    <LinearProgress />
                  </Box>
                ) : (
                  <Box>
                    <Tabs
                      value={tab}
                      onChange={(_, v) => setTab(v)}
                      sx={{px: 2}}
                    >
                      <Tab label="Competencies" />
                      <Tab label="Goals" />
                      <Tab label="Strengths & Improvements" />
                      <Tab label="Summary & Actions" />
                    </Tabs>
                    <Divider />

                    <Box sx={{p: 2}}>
                      {tab === 0 && (
                        <Box>
                          {sectionTitle("Competency ratings")}
                          {(workspace.competencies ?? []).length === 0 ? (
                            <Alert severity="info">
                              No competencies active for this org. Add from
                              catalog →
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{ml: 1}}
                                onClick={() => setShowCatalog(true)}
                              >
                                Add from Catalog
                              </Button>
                            </Alert>
                          ) : (
                            (workspace.competencies ?? []).map((c) => (
                              <CompetencyCard
                                key={c.org_competency_id}
                                item={c}
                                onChange={onCompetencyChange}
                              />
                            ))
                          )}
                        </Box>
                      )}

                      {tab === 1 && (
                        <Box>
                          {sectionTitle("Goal evaluations")}
                          {(workspace.goals ?? []).length === 0 && (
                            <Alert severity="info">
                              No goals found for this cycle.
                            </Alert>
                          )}
                          {(workspace.goals ?? []).map((g) => (
 <GoalCard
  key={`${selected?.employee_id || 'none'}-${g.goal_id}`}
  item={g}
  ownerId={selected?.employee_id}
  onChange={onGoalChange}
/>

))}

                        </Box>
                      )}

                      {tab === 2 && (
                        <Box>
                          <Box
                            sx={{
                              display: "grid",
                              gap: 16,
                              gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"},
                            }}
                          >
                            <Box>
                              {sectionTitle("Strengths")}
                              <TextField
                                fullWidth
                                multiline
                                minRows={6}
                                placeholder="Where does the employee excel?"
                                value={strengths}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setStrengths(v);
                                  debouncedSaveSummary.run({
                                    orgId,
                                    employeeId: selected.employee_id,
                                    cycleId,
                                    strengths: v,
                                    improvements,
                                    summary,
                                    recommendation,
                                  });
                                }}
                              />
                            </Box>
                            <Box>
                              {sectionTitle("Areas to improve")}
                              <TextField
                                fullWidth
                                multiline
                                minRows={6}
                                placeholder="What skills or behaviors should improve?"
                                value={improvements}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setImprovements(v);
                                  debouncedSaveSummary.run({
                                    orgId,
                                    employeeId: selected.employee_id,
                                    cycleId,
                                    strengths,
                                    improvements: v,
                                    summary,
                                    recommendation,
                                  });
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      )}

                      {tab === 3 && (
                        <Box>
                          {sectionTitle("Overall summary")}
                          <TextField
                            fullWidth
                            multiline
                            minRows={6}
                            placeholder="Summarize performance this cycle…"
                            value={summary}
                            onChange={(e) => {
                              const v = e.target.value;
                              setSummary(v);
                              debouncedSaveSummary.run({
                                orgId,
                                employeeId: selected.employee_id,
                                cycleId,
                                strengths,
                                improvements,
                                summary: v,
                                recommendation,
                              });
                            }}
                            sx={{mb: 2}}
                          />
                          <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={2}
                            alignItems="center"
                          >
                            <FormControl size="small" sx={{minWidth: 240}}>
                              <InputLabel>Recommendation</InputLabel>
                              <Select
                                value={recommendation}
                                label="Recommendation"
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setRecommendation(v);
                                  debouncedSaveSummary.run({
                                    orgId,
                                    employeeId: selected.employee_id,
                                    cycleId,
                                    strengths,
                                    improvements,
                                    summary,
                                    recommendation: v,
                                  });
                                }}
                              >
                                <MenuItem value="promotion">Promotion</MenuItem>
                                <MenuItem value="maintain">
                                  Maintain role
                                </MenuItem>
                                <MenuItem value="pip">
                                  Improvement plan
                                </MenuItem>
                              </Select>
                            </FormControl>
                            <Box sx={{flex: 1}} />
                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="outlined"
                                startIcon={<Save />}
                                onClick={saveAll}
                                disabled={saving}
                              >
                                Save
                              </Button>
                              <Button
                                variant="contained"
                                startIcon={<CheckCircle />}
                                onClick={submitAll}
                                disabled={saving}
                              >
                                Finalize
                              </Button>
                            </Stack>
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}
              </Card>
            </Box>
          </Box>

          {/* Past Reviews Drawer */}
          <Drawer
            anchor="right"
            open={showHistory}
            onClose={() => setShowHistory(false)}
          >
            <Box sx={{width: 420, p: 2}}>
              <Typography variant="h6" fontWeight={700} sx={{mb: 1}}>
                Past Reviews
              </Typography>
              <List dense>
                {history.map((r) => (
                  <ListItem key={r.review_id} sx={{mb: 1}}>
                    <ListItemAvatar>
                      <Avatar src={r.avatar_url || undefined}>
                        {r.initials}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600}>
                            {r.employee_name}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={r.cycle_name}
                          />
                        </Stack>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(r.submitted_at), "PP")} • Score{" "}
                            {r.score?.toFixed?.(1) ?? "—"}
                          </Typography>
                          <Typography variant="body2">
                            {r.summary?.slice(0, 120)}
                            {r.summary && r.summary.length > 120 ? "…" : ""}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>

          {/* Catalog Drawer */}
          <Drawer
            anchor="right"
            open={showCatalog}
            onClose={() => setShowCatalog(false)}
          >
            <Box
              sx={{
                width: 440,
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              <Typography variant="h6" fontWeight={700}>
                Global Competency Catalog
              </Typography>
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{minWidth: 140}}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={catalogCategory}
                    label="Category"
                    onChange={(e) => setCatalogCategory(e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="Core">Core</MenuItem>
                    <MenuItem value="Leadership">Leadership</MenuItem>
                    <MenuItem value="Technical">Technical</MenuItem>
                    <MenuItem value="Functional">Functional</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder="Search..."
                  value={catalogQuery}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadCatalog()}
                />
                <Button size="small" onClick={loadCatalog}>
                  Find
                </Button>
              </Stack>

              <List dense sx={{mt: 1}}>
                {catalog.map((c) => (
                  <ListItem
                    key={c.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          try {
                            await supabase.rpc(
                              "add_catalog_competency_to_org",
                              {
                                p_org_id: orgId,
                                p_catalog_id: c.id,
                              }
                            );
                            await loadWorkspace();
                          } catch (e) {
                            setErr(e.message);
                          }
                        }}
                      >
                        Add
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={c.category} />
                          <Typography fontWeight={600}>{c.name}</Typography>
                        </Stack>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {c.description}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Drawer>
        </Box>
      </main>
    </div>
  );
}

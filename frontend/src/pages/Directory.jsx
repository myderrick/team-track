// frontend/src/pages/Directory.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import OrgSwitcher from '@/components/OrgSwitcher';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import { useNavigate } from 'react-router-dom';
import DirectoryFilterBar from '@/components/DirectoryFilterBar';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useSearchParamsState from '@/hooks/useSearchParamsState';

function buildQuarterOptions({ yearsBack = 1, yearsForward = 1 } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const labels = [];
  for (let y = Y - yearsBack; y <= Y + yearsForward; y++) {
    for (let q = 1; q <= 4; q++) labels.push(`Q${q} ${y}`);
  }
  return labels;
}
const quarterOptions = buildQuarterOptions({ yearsBack: 1, yearsForward: 1 });


export default function Directory() {
  const navigate = useNavigate();
  const { orgId, locations, departments, employeeCount } = useOrg();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [quarter, setQuarter] = useState(quarterOptions[1]);
  const [department, setDepartment] = useState('All Departments');
  const [location, setLocation] = useState('All Locations');
   const [search, setSearch] = useState('');

const debouncedSearch = useDebouncedValue(search, 250);
  const [rows, setRows] = useState([]);     // employees for selected org
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
 // Persist filters in the URL
  useSearchParamsState(
    { q: quarter, dep: department, loc: location, s: search },
    { q: setQuarter, dep: setDepartment, loc: setLocation, s: setSearch }
  );

  // Derive location options from org locations
  const locationOptions = useMemo(() => {
    const opts = (locations || []).map(l => l.name || [l.city, l.region, l.country].filter(Boolean).join(', '));
    return ['All Locations', ...Array.from(new Set(opts))];
  }, [locations]);

  // Load employees for current org
  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      if (!orgId) { setRows([]); setLoading(false); return; }
      const { data, error } = await supabase
        .schema('public')
        .rpc('org_employees', { p_org_id: orgId });
      if (error) {
        // If the error is about missing function, show a friendly message
        if (error.message && error.message.includes('Could not find the function public.org_employees')) {
          setError('Directory is unavailable: missing database function. Please contact your administrator.');
        } else {
          setError(error.message);
        }
        setRows([]);
      }
      else setRows(data || []);
      setLoading(false);
    })();
  }, [orgId]);

  // Keep location select in sync when options change
  useEffect(() => {
    if (!locationOptions.includes(location)) setLocation('All Locations');
  }, [locationOptions]); // eslint-disable-line

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const filtered = useMemo(() => {
    return (rows || []).filter(u => {
      if (department !== 'All Departments' && (u.department || '') !== department) return false;
      if (location !== 'All Locations' && (u.location || '') !== location) return false;
const q = debouncedSearch.trim().toLowerCase();
      if (!q) return true;
      return [
        u.full_name, u.email, u.title, u.department, u.location
      ].filter(Boolean).some(x => String(x).toLowerCase().includes(q));
    });
  }, [rows, debouncedSearch, department, location]);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Pro filter bar */}
       <DirectoryFilterBar
          title="Team Directory"
          subtitle="Browse employees in your selected organization"
          quarter={quarter}
          setQuarter={setQuarter}
          quarterOptions={quarterOptions}
          department={department}
          setDepartment={setDepartment}
          departmentOptions={['All Departments', ...(departments || [])]}
          location={location}
          setLocation={setLocation}
          locationOptions={locationOptions}
          search={search}
          setSearch={setSearch}
          onAddEmployee={() => navigate('/employees/add')}
        />

        {/* Main Content */}
        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-6 overflow-auto">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            {/* top rule not needed; the filter bar already anchors the section */}
            <div className="mb-2" />
            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : error ? (
              <EmptyState title="Unable to load directory" subtitle={error} />
            ) : employeeCount === 0 ? (
              <EmptyState title="No employees yet" subtitle="Add your first employee to populate the directory.">
                <Link to="/employees/add" className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">Add employee</Link>
              </EmptyState>
            ) : filtered.length === 0 ? (
              <EmptyState title="No matches" subtitle="Try changing your filters or search." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(u => (
                  <Link
                    key={u.id}
                    to={`/staff/${u.id}`}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
                  >
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-sm text-gray-500">
                      {(u.title || '—')}{u.department ? ` — ${u.department}` : ''}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {u.email || 'no email'}{u.location ? ` • ${u.location}` : ''}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

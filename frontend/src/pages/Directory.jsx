// Directory.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import OrgSwitcher from '@/components/OrgSwitcher';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';

const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

export default function Directory() {
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
  const [rows, setRows] = useState([]);     // employees for selected org
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [
        u.full_name, u.email, u.title, u.department, u.location
      ].filter(Boolean).some(x => String(x).toLowerCase().includes(q));
    });
  }, [rows, search, department, location]);

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64 transition-margin duration-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Directory</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Browse employees in your selected organization</p>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">
            <OrgSwitcher />

            <select value={quarter} onChange={e => setQuarter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
              {quarterOptions.map(q => <option key={q}>{q}</option>)}
            </select>

            <select value={department} onChange={e => setDepartment(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
              <option>All Departments</option>
              {(departments || []).map(d => <option key={d}>{d}</option>)}
            </select>

            <select value={location} onChange={e => setLocation(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
              {locationOptions.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-6 overflow-auto">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <div className="flex flex-wrap gap-4 mb-6">
              <input
                type="search" placeholder="Search name, email, title…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="px-3 py-2 border rounded-lg flex-1"
              />
            </div>

            {/* Add New Employee Button */}
            <Link to="/employees/add" className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">Add employee</Link>
            <div className="my-4 border-t border-gray-200 dark:border-gray-700" />
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
                    to={`/profile/${u.id}`}
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

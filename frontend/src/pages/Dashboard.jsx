// frontend/src/pages/Dashboard.jsx
import React, {useEffect, useState} from "react";
import {Plus} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useOrg} from "@/context/OrgContext";
import StatKpiRow from "../components/StatKpiRow";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import OrgSwitcher from "@/components/OrgSwitcher";
import FilterBar from "../components/FilterBar";
import EmptyState from "@/components/EmptyState";
import ErrorBoundary from "@/components/ErrorBoundary";
import {Link} from "react-router-dom";
import IndividualLeaderboard from "@/components/IndividualLeaderboard";
import TeamPerformanceChart from "@/components/TeamPerformanceChart";
import GoalProgress from "@/components/GoalProgress";
import SmartAlerts from "@/components/SmartAlerts";
import RecentActivityPro from "@/components/RecentActivityPro";
import {useRecentActivity} from "@/hooks/useRecentActivity";
import AiCoaching from "@/components/AiCoaching";
import AddWidgetDialog from "@/components/AddWidgetDialog";
import useSearchParamsState from "@/hooks/useSearchParamsState";

const periodOptions = [
  ...buildQuarterOptions({yearsBack: 0, yearsForward: 0}), // Q1..Q4 of current year
  "This Year",
  "Last Year",
];

function startOfQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3); // 0..3
  return new Date(d.getFullYear(), q * 3, 1);
}
function endOfQuarter(d = new Date()) {
  const s = startOfQuarter(d);
  return new Date(s.getFullYear(), s.getMonth() + 3, 0, 23, 59, 59, 999);
}
function startOfYear(y = new Date().getFullYear()) {
  return new Date(y, 0, 1);
}
function endOfYear(y = new Date().getFullYear()) {
  return new Date(y, 11, 31, 23, 59, 59, 999);
}

function buildQuarterOptions({yearsBack = 0, yearsForward = 0} = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const labels = [];
  for (let y = Y - yearsBack; y <= Y + yearsForward; y++) {
    for (let q = 1; q <= 4; q++) labels.push(`Q${q} ${y}`);
  }
  return labels;
}

/** Returns canonical period object {kind, label, start, end, year, quarter?} */
function periodFromLabel(label, now = new Date()) {
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  if (label === "This Year") {
    return {
      kind: "year",
      label,
      year: thisYear,
      start: startOfYear(thisYear),
      end: endOfYear(thisYear),
    };
  }
  if (label === "Last Year") {
    return {
      kind: "year",
      label,
      year: lastYear,
      start: startOfYear(lastYear),
      end: endOfYear(lastYear),
    };
  }

  // Qx YYYY
  const m = /^Q([1-4])\s+(\d{4})$/.exec(label);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    const start = new Date(y, (q - 1) * 3, 1);
    const end = new Date(y, (q - 1) * 3 + 3, 0, 23, 59, 59, 999);
    return {kind: "quarter", label, year: y, quarter: q, start, end};
  }

  // Fallback: treat as this year
  return {
    kind: "year",
    label: "This Year",
    year: thisYear,
    start: startOfYear(thisYear),
    end: endOfYear(thisYear),
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {employeeCount, locations, departments, loading} = useOrg();
  const [addOpen, setAddOpen] = useState(false);
  const {orgId} = useOrg();
  const {activities, loading: actLoading} = useRecentActivity({
    orgId,
    limit: 20,
  });

  const [view, setView] = useState("individual");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Default to "This Year"
  const [periodLabel, setPeriodLabel] = useState("This Year");
  const period = React.useMemo(
    () => periodFromLabel(periodLabel),
    [periodLabel]
  );
  const [department, setDepartment] = useState("All Departments");
  const [location, setLocation] = useState("");

  useSearchParamsState(
    {view, period: periodLabel, dept: department, loc: location},
    {
      view: setView,
      period: setPeriodLabel,
      dept: setDepartment,
      loc: setLocation,
    }
  );

  // sync initial location to first available org location
  useEffect(() => {
    if (locations && locations.length > 0) {
      const first = locations[0];
      setLocation(first.name || first.country || "Default");
    } else if (!loading) {
      setLocation(""); // no locations yet
    }
  }, [locations, loading]);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />

            

          <FilterBar
            title="Dashboard"
            subtitle={
              period.kind === "year"
                ? `Performance overview for ${period.year}`
                : `Performance overview for Q${period.quarter} ${period.year}`
            }
            view={view}
            setView={setView}
            periodLabel={periodLabel}
            setPeriodLabel={setPeriodLabel}
            periodOptions={periodOptions}
            department={department}
            setDepartment={setDepartment}
            departments={departments}
            location={location}
            setLocation={setLocation}
            locations={locations}
            onAddWidget={() => setAddOpen(true)}
          />

          

          {/* Empty-state prompt stays the same */}
          {employeeCount === 0 && (
            <div className="flex-1 ml-16 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-6 overflow-auto">
              <EmptyState
                title="Let's add your first employee"
                subtitle="Add someone to unlock leaderboards, goals, and performance insights."
              >
                <button
                  onClick={() => navigate("/employees/add")}
                  className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                >
                  Add employee
                </button>
              </EmptyState>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 ml-16 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-6 overflow-auto">
            <div className="mx-auto max-w-7xl w-full">
              {/* KPI header row */}
              <div className="flex justify-between items-center mb-4">
          {/* Button to switch to /staff/dashboard */}
          <button
            type="button"
            onClick={() => navigate("/staff")}
            className="mt-2 inline-flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Switch to Staff Dashboard
          </button>

          </div>

              {employeeCount > 0 && (
                <StatKpiRow
                  metrics={{
                    headcount: employeeCount,
                    goalsOnTrackPct: "62%",
                    openAlerts: 3,
                    trendPct: "+8%",
                  }}
                />
              )}

              {view === "individual" ? (
                employeeCount > 0 ? (
                  <ErrorBoundary>
                    <IndividualLeaderboard
                      period={period}
                      department={department}
                      location={location}
                    />
                  </ErrorBoundary>
                ) : (
                  <EmptyState
                    title="No individual performance data"
                    subtitle="Add employees to populate the leaderboard."
                  />
                )
              ) : (
                <>
                  {/* <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                   <EmptyState title="No KPIs yet" subtitle="Connect data sources or add KPIs to see cards here." />
                 </div> */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 items-stretch">
                    <div className="h-full">
                      {employeeCount > 0 ? (
                        <TeamPerformanceChart
                          period={period}
                          department={department}
                          location={location}
                        />
                      ) : (
                        <EmptyState
                          title="No team performance"
                          subtitle="Data will appear once employees are active."
                        />
                      )}
                    </div>
                    <div className="h-full">
                      {employeeCount > 0 ? (
                        <GoalProgress
                          period={period}
                          department={department}
                          location={location}
                        />
                      ) : (
                        <EmptyState
                          title="No goals"
                          subtitle="Create goals to see progress here."
                        />
                      )}
                    </div>
                  </div>

                  <div className="-mx-6 px-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                      {actLoading ? (
                        <div className="h-40 animate-pulse rounded-2xl bg-gray-200/60 dark:bg-gray-700/50" />
                      ) : (
                        <RecentActivityPro
                          activities={activities}
                          onViewAll={() => navigate("/activity")}
                        />
                      )}{" "}
                      <SmartAlerts period={period} />
                      <AiCoaching period={period} department={department} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
      <AddWidgetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(key) => {
          setAddOpen(false); /* route or insert widget */
        }}
      />
    </>
  );
}

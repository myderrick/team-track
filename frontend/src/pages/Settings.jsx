import React, { useState } from 'react';
import { useEffect } from 'react';
import { allGoals as initialGoals } from '../data';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

export default function Settings() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    // Persist dark mode
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

    const [goals, setGoals] = useState(initialGoals);
    const [newGoal, setNewGoal] = useState({
        title: '',
        target: '',
        unit: '',
        type: 'monetary'
    });
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

    const addGoal = () => {
        if (!newGoal.title) return;
        setGoals(g => [
            ...g,
            { id: `g${g.length + 1}`, ...newGoal }
        ]);
        setNewGoal({ title: '', target: '', unit: '', type: 'monetary' });
    };

    const startEdit = goal => {
        setEditingId(goal.id);
        setEditValues({ ...goal });
    };
    const saveEdit = () => {
        setGoals(g =>
            g.map(goal =>
                goal.id === editingId ? { ...editValues } : goal
            )
        );
        setEditingId(null);
        setEditValues({});
    };
    const cancelEdit = () => {
        setEditingId(null);
        setEditValues({});
    };
    const deleteGoal = id => {
        setGoals(g => g.filter(goal => goal.id !== id));
        if (editingId === id) cancelEdit();
    };

    return (
        <div className="flex flex-col h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <TopBar
                onMenuClick={() => setSidebarOpen(o => !o)}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(m => !m)}
            />

            <div className="flex items-center p-4 bg-white dark:bg-gray-800 shadow ml-16                          /* collapsed sidebar width */
                group-hover:ml-64              /* expanded sidebar width */
                transition-margin duration-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage Global Settings</p>
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

                {/* Goal Templates */}
                <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow rounded-xl">
                    <h3 className="font-medium mb-2">Goal Templates</h3>
                    <ul className="mb-4 space-y-2">
                        {goals.map(goal => (
                            <li
                                key={goal.id}
                                className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm"
                            >
                                {editingId === goal.id ? (
                                    <div className="flex-1 space-y-2">
                                        <input
                                            className="w-full px-2 py-1 border rounded"
                                            value={editValues.title}
                                            onChange={e =>
                                                setEditValues(ev => ({ ...ev, title: e.target.value }))
                                            }
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                className="w-24 px-2 py-1 border rounded"
                                                value={editValues.target}
                                                onChange={e =>
                                                    setEditValues(ev => ({ ...ev, target: e.target.value }))
                                                }
                                            />
                                            <input
                                                className="w-24 px-2 py-1 border rounded"
                                                value={editValues.unit}
                                                onChange={e =>
                                                    setEditValues(ev => ({ ...ev, unit: e.target.value }))
                                                }
                                            />
                                            <select
                                                className="px-2 py-1 border rounded"
                                                value={editValues.type}
                                                onChange={e =>
                                                    setEditValues(ev => ({ ...ev, type: e.target.value }))
                                                }
                                            >
                                                <option value="monetary">Monetary</option>
                                                <option value="count">Count</option>
                                                <option value="qualitative">Qualitative</option>
                                            </select>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveEdit}
                                                className="px-3 py-1 bg-green-600 text-white rounded"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="px-3 py-1 bg-gray-300 rounded"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1">
                                            <span className="font-medium">{goal.title}</span>
                                            <span className="ml-2 text-gray-500">
                                                ({goal.target} {goal.unit})
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => startEdit(goal)}
                                                className="text-blue-600 hover:underline text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deleteGoal(goal.id)}
                                                className="text-red-600 hover:underline text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>

                    {/* Add new template */}
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            placeholder="Title"
                            value={newGoal.title}
                            onChange={e =>
                                setNewGoal(n => ({ ...n, title: e.target.value }))
                            }
                            className="px-2 py-1 border rounded flex-1"
                        />
                        <input
                            placeholder="Target"
                            type="number"
                            value={newGoal.target}
                            onChange={e =>
                                setNewGoal(n => ({ ...n, target: e.target.value }))
                            }
                            className="px-2 py-1 border rounded w-24"
                        />
                        <input
                            placeholder="Unit"
                            value={newGoal.unit}
                            onChange={e =>
                                setNewGoal(n => ({ ...n, unit: e.target.value }))
                            }
                            className="px-2 py-1 border rounded w-24"
                        />
                        <select
                            value={newGoal.type}
                            onChange={e =>
                                setNewGoal(n => ({ ...n, type: e.target.value }))
                            }
                            className="px-2 py-1 border rounded"
                        >
                            <option value="monetary">Monetary</option>
                            <option value="count">Count</option>
                            <option value="qualitative">Qualitative</option>
                        </select>
                        <button
                            onClick={addGoal}
                            className="px-3 py-1 bg-purple-600 text-white rounded"
                        >
                            Add Template
                        </button>
                    </div>
                </section>

                {/* Metric Library (stub) */}
                <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow rounded-xl">
                    <h3 className="font-medium mb-2">Metric Library</h3>
                    <p className="text-sm text-gray-500">
                        Define units and labels here. (Coming soon)
                    </p>
                </section>
            </main>
        </div>
    );
}

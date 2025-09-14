import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    users,
    allGoals,
    performanceData,
    feedbackNotes as initialFeedback,
    trainingRecords as initialTraining
} from '../data';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

export default function Profile() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) return saved === 'true';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);
    const history = window.history;

    const { id } = useParams();
    const user = users.find(u => u.id === id);

    // performance entries
    const entries = performanceData.filter(d => d.userId === id);

    // feedback & training state
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [training, setTraining] = useState([]);
    const [newTraining, setNewTraining] = useState({ course: '', date: '', status: 'Completed' });

    // init from dummy
    useEffect(() => {
        setNotes(initialFeedback.filter(n => n.userId === id));
        setTraining(initialTraining.filter(t => t.userId === id));
    }, [id]);

    const addNote = () => {
        if (!newNote.trim()) return;
        setNotes(n => [
            ...n,
            { userId: id, date: new Date().toISOString().slice(0, 10), note: newNote, author: 'Manager' }
        ]);
        setNewNote('');
    };

    const addTraining = () => {
        if (!newTraining.course) return;
        setTraining(t => [
            ...t,
            { userId: id, ...newTraining }
        ]);
        setNewTraining({ course: '', date: '', status: 'Completed' });
    };

    return (
        <div className="flex flex-col h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <TopBar
                onMenuClick={() => setSidebarOpen(o => !o)}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(m => !m)}
            />
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
                <button onClick={() => history.back()} className="text-blue-600 mb-4">
                    ← Back
                </button>
                <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">

                    <h2 className="text-2xl font-semibold">{user.name}</h2>
                    <p className="text-sm text-gray-500">{user.role} — {user.team}</p>


                    {/* Goals */}
                    <section className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow rounded-xl">
                        <h3 className="font-medium mb-2">Goals & Performance</h3>
                        <ul className="space-y-4">
                            {allGoals.map(goal => {
                                const e = entries.find(x => x.goalId === goal.id);
                                const val = e ? e.value : 0;
                                const pct = Math.min(100, Math.round((val / goal.target) * 100));
                                return (
                                    <li key={goal.id}>
                                        <div className="flex justify-between mb-1">
                                            <span>{goal.title}</span>
                                            <span className="text-sm text-gray-600">
                                                {val}{goal.unit} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div className="h-2 bg-green-500" style={{ width: `${pct}%` }} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    {/* Feedback */}
                    <section className="mt-8">
                        <h3 className="font-medium mb-2">Feedback & Notes</h3>
                        <ul className="space-y-2 mb-4">
                            {notes.map((n, i) => (
                                <li key={i} className="text-sm">
                                    <span className="font-medium">{n.date}</span>: {n.note} <em>({n.author})</em>
                                </li>
                            ))}
                        </ul>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 px-2 py-1 border rounded"
                                placeholder="Add a note..."
                                value={newNote}
                                onChange={e => setNewNote(e.target.value)}
                            />
                            <button
                                onClick={addNote}
                                className="px-3 py-1 bg-blue-600 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </section>

                    {/* Training */}
                    <section className="mt-8">
                        <h3 className="font-medium mb-2">Training Records</h3>
                        <ul className="space-y-2 mb-4">
                            {training.map((t, i) => (
                                <li key={i} className="text-sm">
                                    {t.date} – <strong>{t.course}</strong> (<em>{t.status}</em>)
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap gap-2 items-center">
                            <input
                                className="px-2 py-1 border rounded flex-1"
                                placeholder="Course name"
                                value={newTraining.course}
                                onChange={e =>
                                    setNewTraining(n => ({ ...n, course: e.target.value }))
                                }
                            />
                            <input
                                type="date"
                                className="px-2 py-1 border rounded"
                                value={newTraining.date}
                                onChange={e =>
                                    setNewTraining(n => ({ ...n, date: e.target.value }))
                                }
                            />
                            <select
                                className="px-2 py-1 border rounded"
                                value={newTraining.status}
                                onChange={e =>
                                    setNewTraining(n => ({ ...n, status: e.target.value }))
                                }
                            >
                                <option>Completed</option>
                                <option>In Progress</option>
                                <option>Not Started</option>
                            </select>
                            <button
                                onClick={addTraining}
                                className="px-3 py-1 bg-green-600 text-white rounded"
                            >
                                Add
                            </button>
                        </div>
                    </section>
                </div>
            </main>

        </div >
    );
}

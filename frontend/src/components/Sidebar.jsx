// src/components/Sidebar.jsx
export default function Sidebar({ open, onClose }) {
    return (
        <aside
            className={[
                'fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg',
                'transform transition-transform duration-200 ease-in-out',
                open ? 'translate-x-0' : '-translate-x-full'
            ].join(' ')}
        >
            {/* …nav links… */}
        </aside>
    )
}

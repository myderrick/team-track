// src/components/WidgetWrapper.jsx
export default function WidgetWrapper({ title, footer, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border dark:border-gray-700 flex flex-col justify-between">
            <div>{children}</div>
            <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3 text-sm text-blue-600 hover:underline cursor-pointer">
                {footer || 'View Report →'}
            </div>
        </div>
    );
}

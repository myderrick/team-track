// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 text-center">
            <h1 className="text-5xl font-bold text-blue-600 mb-4">404</h1>
            <p className="text-gray-600 mb-6">Page not found</p>
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
                Go back to Login
            </Link>
        </div>
    );
}

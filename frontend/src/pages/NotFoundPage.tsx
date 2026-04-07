import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen t-bg flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-6xl">🍱</p>
        <h1 className="text-2xl font-bold t-text">Page not found</h1>
        <p className="t-text-muted text-sm">This page doesn't exist or was moved.</p>
        <Link
          to="/"
          className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

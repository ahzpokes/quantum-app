'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="app-container flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center space-y-4">
        <div className="text-4xl">🤔</div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Page introuvable</h1>
        <p className="text-gray-600 dark:text-gray-300">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

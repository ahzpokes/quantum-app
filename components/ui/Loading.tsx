import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Loading: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto" />

        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Chargement de votre tableau de bord...
        </p>
      </div>
    </div>
  );
};

export default Loading;

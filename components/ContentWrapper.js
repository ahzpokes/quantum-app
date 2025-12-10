'use client';
import { useEffect, useState } from 'react';

export default function ContentWrapper({ children }) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Add a small delay to ensure AuthProvider has checked session
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 50);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div style={{
            visibility: isReady ? 'visible' : 'hidden',
            opacity: isReady ? 1 : 0,
            transition: 'opacity 0.3s ease-in'
        }}>
            {children}
        </div>
    );
}

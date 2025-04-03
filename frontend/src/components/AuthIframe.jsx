// components/AuthIframe.jsx
import React, { useState, useEffect } from 'react';

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== 'https://atlas.appweb.space') return;

            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
            }

            if (event.data.type === 'ATLAS_AUTH_SUCCESS') {
                localStorage.setItem('access_token', event.data.tokens.access_token);
                localStorage.setItem('refresh_token', event.data.tokens.refresh_token);
                window.location.href = '/';
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <iframe
            src={src}
            style={{
                width: '100%',
                height: `${iframeHeight}px`,
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
            scrolling="no"
        />
    );
};

export default AuthIframe;
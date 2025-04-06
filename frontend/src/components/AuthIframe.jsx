import React, { useState, useEffect } from 'react';
import { register as registerLocalUser } from '../api';

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    const [isProcessing, setIsProcessing] = useState(false);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;

    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.origin !== 'https://atlas.appweb.space') return;

            console.log('Received message:', event.data);

            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
                return;
            }

            setIsProcessing(true);

            try {
                // Обработка входа (логина)
                if (event.data.type === 'ATLAS_AUTH_SUCCESS') {
                    const { tokens } = event.data;

                    if (!tokens?.access_token || !tokens?.refresh_token) {
                        throw new Error('Invalid tokens structure');
                    }

                    localStorage.setItem('access_token', tokens.access_token);
                    localStorage.setItem('refresh_token', tokens.refresh_token);

                    console.log('Login successful, tokens saved');
                    window.location.href = '/';
                }

                // Обработка регистрации
                else if (event.data.type === 'ATLAS_REGISTER_SUCCESS') {
                    const { user } = event.data;

                    if (!user?.id || !user?.email) {
                        throw new Error('Invalid user data structure');
                    }

                    console.log('Registering user:', user);

                    await registerLocalUser({
                        external_user_id: user.id,
                        email: user.email,
                        username: user.username || ''
                    });

                    console.log('Local registration completed');
                    window.location.href = '/';
                }
                else {
                    console.warn('Unknown message type:', event.data.type);
                }
            } catch (error) {
                console.error('Processing error:', error);
                alert(`Error: ${error.message}`);
            } finally {
                setIsProcessing(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []); // Убрали mode из зависимостей, так как он не используется в обработчике

    return (
        <div style={{ position: 'relative' }}>
            {isProcessing && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10
                }}>
                    <div>{mode === 'login' ? 'Logging in...' : 'Completing registration...'}</div>
                </div>
            )}
            <iframe
                src={src}
                style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    opacity: isProcessing ? 0.5 : 1
                }}
                scrolling="no"
                title={`Atlas ${mode === 'login' ? 'Login' : 'Registration'}`}
            />
        </div>
    );
};

export default AuthIframe;
import React, { useState, useEffect } from 'react';
import { register as registerLocalUser } from '../api'; // Импортируем ваш метод регистрации

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    const [isProcessing, setIsProcessing] = useState(false);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;

    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.origin !== 'https://atlas.appweb.space') return;

            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
            }

            if (event.data.type === 'ATLAS_AUTH_SUCCESS') {
                setIsProcessing(true);
                try {
                    const { access_token, refresh_token, user } = event.data.tokens;

                    // Сохраняем токены
                    localStorage.setItem('access_token', access_token);
                    localStorage.setItem('refresh_token', refresh_token);

                    // Если это регистрация - создаем пользователя в локальной БД
                    if (mode === 'register' && user) {
                        await registerLocalUser({
                            atlas_user_id: user.id, // ID из Atlas
                            email: user.email,
                            username: user.username,
                            // Другие необходимые поля
                        });
                    }

                    // Перенаправляем на главную
                    window.location.href = '/';
                } catch (error) {
                    console.error('Ошибка обработки авторизации:', error);
                    // Можно добавить отображение ошибки пользователю
                } finally {
                    setIsProcessing(false);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [mode]);

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
                    <div>Завершаем регистрацию...</div>
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
                title={`Atlas ${mode === 'login' ? 'Вход' : 'Регистрация'}`}
            />
        </div>
    );
};

export default AuthIframe;
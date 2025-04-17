// AuthIframe.jsx

import React, { useState, useEffect } from 'react';

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    const [isProcessing, setIsProcessing] = useState(false);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;
    const atlasOrigin = 'https://atlas.appweb.space';

    useEffect(() => {
        const handleMessage = async (event) => {
            if (event.origin !== atlasOrigin) {
                console.warn('Message received from unexpected origin:', event.origin);
                return;
            }

            console.log('Received message from Atlas:', event.data);

            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
                return;
            }

            if (event.data.type === 'ATLAS_AUTH_SUCCESS' || event.data.type === 'ATLAS_REGISTER_SUCCESS') {
                setIsProcessing(true);
                const { tokens, user } = event.data; // Получаем токены и (возможно) пользователя

                // --- ИСПРАВЛЕННАЯ ВАЛИДАЦИЯ ---
                // 1. Токены обязательны всегда
                if (!tokens?.access_token || !tokens?.refresh_token) {
                    console.error('Invalid data structure: Missing tokens.', event.data);
                    alert('Authentication failed: Tokens not received.');
                    setIsProcessing(false);
                    return;
                }

                // 2. Проверяем пользователя: он обязателен для регистрации,
                //    но может отсутствовать при логине.
                let userDataToSend = null;
                if (user?.id && user?.email) {
                    // Если данные пользователя есть, формируем объект для отправки
                    userDataToSend = {
                        id: user.id,
                        email: user.email,
                        username: user.username || '' // Используем username или пустую строку
                    };
                } else if (event.data.type === 'ATLAS_REGISTER_SUCCESS') {
                    // Если это РЕГИСТРАЦИЯ, а данных пользователя НЕТ - это ошибка
                    console.error('Invalid data structure: Missing user data on registration.', event.data);
                    alert('Registration failed: Required user data not received from Atlas.');
                    setIsProcessing(false);
                    return;
                }
                // Если это ЛОГИН и данных пользователя нет - это нормально, userDataToSend останется null.
                // --- КОНЕЦ ИСПРАВЛЕННОЙ ВАЛИДАЦИИ ---

                console.log('Validation successful, posting ATLAS_AUTH_COMPLETE to parent.'); // Добавим лог
                // Отправляем сообщение родительскому окну (App.jsx)
                window.parent.postMessage({
                    type: 'ATLAS_AUTH_COMPLETE',
                    tokens: tokens,
                    user: userDataToSend // Отправляем null, если данных не было (при логине)
                }, window.location.origin); // Отправляем на свой origin

                setIsProcessing(false); // Можно убрать индикатор

            } else if (event.data.type === 'ATLAS_AUTH_ERROR') {
                console.error('Atlas authentication error:', event.data.error);
                alert(`Authentication failed: ${event.data.error?.message || 'Unknown error from Atlas'}`);
                setIsProcessing(false);
            } else {
                console.warn('Unknown message type received from Atlas:', event.data.type);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []); // Зависимости не нужны

    // Остальная часть компонента без изменений...
    return (
        <div style={{ position: 'relative' }}>
            {/* ... индикатор isProcessing ... */}
            <iframe
                src={src}
                style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    opacity: isProcessing ? 0.5 : 1
                }}
                scrolling="no"
                title={`Atlas ${mode === 'login' ? 'Login' : 'Registration'}`}
            />
        </div>
    );
};

export default AuthIframe;
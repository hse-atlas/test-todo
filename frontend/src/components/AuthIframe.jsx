// AuthIframe.jsx

import React, { useState, useEffect } from 'react';
// Импортируем функцию для вызова ВАШЕГО бэкенда /register
import { register as registerOrLoginLocalUser } from '../api';

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    const [isProcessing, setIsProcessing] = useState(false);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;
    const atlasOrigin = 'https://atlas.appweb.space';

    useEffect(() => {
        const handleMessage = async (event) => {
            // Проверка origin
            if (event.origin !== atlasOrigin) {
                console.warn('Message received from unexpected origin:', event.origin);
                return;
            }
            console.log('Received message from Atlas:', event.data);

            // Обработка высоты
            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
                return;
            }

            // Обработка успеха аутентификации/регистрации от Atlas
            if (event.data.type === 'ATLAS_AUTH_SUCCESS' || event.data.type === 'ATLAS_REGISTER_SUCCESS') {
                setIsProcessing(true);
                const { tokens, user } = event.data;

                // 1. Валидация токенов от Atlas
                if (!tokens?.access_token || !tokens?.refresh_token) {
                    console.error('[AuthIframe] Invalid data structure: Missing tokens from Atlas.', event.data);
                    alert('Authentication failed: Tokens not received from Atlas.');
                    setIsProcessing(false);
                    return;
                }

                // 2. Валидация данных пользователя от Atlas (нужны для вызова нашего /register)
                // Ваш бэкенд /register требует external_user_id и email
                if (!user?.id || !user?.email) {
                    console.error('[AuthIframe] Invalid data structure: Missing user ID or Email from Atlas.', event.data);
                    alert('Authentication failed: Essential user data not received from Atlas.');
                    setIsProcessing(false);
                    return;
                }

                // Подготовка данных для ВАШЕГО бэкенда /register
                const localApiUserData = {
                    external_user_id: user.id, // Используем ID от Atlas
                    email: user.email,
                    username: user.username || `user_${user.id}` // Генерируем username, если его нет
                };

                try {
                    // 3. Вызов ВАШЕГО бэкенда /register (Find or Create)
                    console.log('[AuthIframe] Calling local backend /register with data:', localApiUserData);
                    // Нам не нужен результат (user response), нам важно, что вызов прошел без ошибок
                    await registerOrLoginLocalUser(localApiUserData);
                    console.log('[AuthIframe] Local backend /register call successful.');

                    // 4. Отправка сообщения родительскому App.jsx ПОСЛЕ успеха локального API
                    console.log('[AuthIframe] Posting ATLAS_AUTH_COMPLETE to parent.');
                    window.parent.postMessage({
                        type: 'ATLAS_AUTH_COMPLETE',
                        tokens: tokens, // Отправляем токены, полученные от Atlas
                        // Отправляем данные пользователя от Atlas (может быть полезно для App.jsx)
                        user: {
                            id: user.id,
                            email: user.email,
                            username: user.username || localApiUserData.username // Отправляем использованный username
                        }
                    }, window.location.origin); // Отправляем на свой origin

                } catch (error) {
                    // Обработка ошибок от ВАШЕГО бэкенда /register
                    console.error('[AuthIframe] Error calling local backend /register:', error);
                    let errorDetail = 'Failed to register or login locally.';
                    if (error.response) { // Ошибка от Axios
                        errorDetail = error.response.data?.detail || `Local backend error: ${error.response.status}`;
                        // Особая обработка конфликта email
                        if (error.response.status === 409) {
                            errorDetail = `This email (${localApiUserData.email}) is already associated with another account in our system. Please use a different login method or contact support.`;
                        }
                    } else if (error.message) { // Другая ошибка JS
                        errorDetail = error.message;
                    }
                    alert(`Authentication Error: ${errorDetail}`);
                    // Не отправляем ATLAS_AUTH_COMPLETE, если локальный вызов неудачен
                } finally {
                    // Завершаем индикатор загрузки
                    setIsProcessing(false);
                }

            } else if (event.data.type === 'ATLAS_AUTH_ERROR') {
                // Обработка ошибок, пришедших от Atlas
                console.error('[AuthIframe] Atlas authentication error reported:', event.data.error);
                alert(`Authentication failed via Atlas: ${event.data.error?.message || 'Unknown error'}`);
                setIsProcessing(false);
            } else {
                console.warn('[AuthIframe] Unknown message type received from Atlas:', event.data.type);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []); // Зависимости не нужны

    // --- JSX Рендеринг iframe (без изменений) ---
    return (
        <div style={{ position: 'relative' }}>
            {isProcessing && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(255,255,255,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 10
                }}>
                    <div>Processing...</div> {/* Можно добавить Spin */}
                </div>
            )}
            <iframe
                src={src}
                style={{
                    width: '100%', height: `${iframeHeight}px`, border: 'none',
                    opacity: isProcessing ? 0.5 : 1
                }}
                scrolling="no"
                title={`Atlas ${mode === 'login' ? 'Login' : 'Registration'}`}
            />
        </div>
    );
};

export default AuthIframe;
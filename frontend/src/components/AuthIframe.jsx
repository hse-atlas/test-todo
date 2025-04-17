// AuthIframe.jsx

import React, { useState, useEffect } from 'react';
// Импортируем функцию ТОЛЬКО для регистрации
import { register as registerLocalUser } from '../api';

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    const [isProcessing, setIsProcessing] = useState(false); // Состояние для индикации процесса
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;
    const atlasOrigin = 'https://atlas.appweb.space';

    useEffect(() => {
        const handleMessage = async (event) => {
            // Проверка origin
            if (event.origin !== atlasOrigin) {
                console.warn('[AuthIframe] Message received from unexpected origin:', event.origin);
                return;
            }
            console.log('[AuthIframe] Received message from Atlas:', event.data);

            // Обработка высоты iframe
            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
                return;
            }

            // === Обработка РЕГИСТРАЦИИ (ATLAS_REGISTER_SUCCESS) ===
            // Логика остается прежней: вызвать локальный API и отправить postMessage для редиректа на /login
            if (event.data.type === 'ATLAS_REGISTER_SUCCESS') {
                setIsProcessing(true);
                const { user } = event.data;

                // Валидация данных пользователя
                if (!user?.id || !user?.email) {
                    console.error('[AuthIframe-Register] Invalid user data from Atlas.', event.data);
                    alert('Registration failed: Essential user data not received.');
                    setIsProcessing(false);
                    return;
                }

                // Подготовка данных для локального API
                const localApiUserData = {
                    external_user_id: user.id,
                    email: user.email,
                    username: user.username || `user_${user.id}`
                };

                try {
                    // Вызов локального API /register
                    console.log('[AuthIframe-Register] Calling local backend /register:', localApiUserData);
                    await registerLocalUser(localApiUserData);
                    console.log('[AuthIframe-Register] Local registration OK.');

                    // Отправка сообщения для редиректа на /login
                    console.log('[AuthIframe-Register] Sending REDIRECT_TO_LOGIN to parent.');
                    window.parent.postMessage({ type: 'REDIRECT_TO_LOGIN' }, window.location.origin);

                } catch (error) {
                    // Обработка ошибок локального API
                    console.error('[AuthIframe-Register] Error calling local backend /register:', error);
                    let errorDetail = 'Failed to register locally.';
                    if (error.response) {
                        errorDetail = error.response.data?.detail || `Local backend error: ${error.response.status}`;
                        if (error.response.status === 409) {
                            errorDetail = `This email (${localApiUserData.email}) is already registered. Try logging in or use a different email.`;
                        }
                    } else { errorDetail = error.message; }
                    alert(`Registration Error: ${errorDetail}`);
                    // Редирект на логин не происходит при ошибке
                } finally {
                    setIsProcessing(false);
                }
            }
            // === Обработка ЛОГИНА (ATLAS_AUTH_SUCCESS) ===
            // Теперь мы это сообщение полностью ИГНОРИРУЕМ.
            // Бэкенд Atlas сам выполнит редирект родительского окна
            // на URL с токенами в query-параметрах.
            // App.jsx (через TokenHandler) подхватит эти параметры.
            else if (event.data.type === 'ATLAS_AUTH_SUCCESS') {
                console.log('[AuthIframe-Login] Received ATLAS_AUTH_SUCCESS message from Atlas. Ignoring it, as login is handled via URL redirect by Atlas backend.');
                // Мы не отправляем postMessage отсюда.
                // Можно включить индикатор загрузки, чтобы пользователь видел, что что-то происходит,
                // пока бэкенд Atlas делает редирект.
                setIsProcessing(true);
                // Этот индикатор сам исчезнет при перезагрузке страницы из-за редиректа.
            }
            // === Обработка ошибок от Atlas (ATLAS_AUTH_ERROR) ===
            else if (event.data.type === 'ATLAS_AUTH_ERROR') {
                console.error('[AuthIframe] Atlas authentication error reported:', event.data.error);
                alert(`Authentication failed via Atlas: ${event.data.error?.message || 'Unknown error'}`);
                // Сбрасываем индикатор, если он был включен
                setIsProcessing(false);
            }
            // === Обработка неизвестных типов сообщений ===
            // Игнорируем ATLAS_IFRAME_HEIGHT здесь, т.к. он обработан выше
            else if (event.data.type !== 'ATLAS_IFRAME_HEIGHT') {
                console.warn('[AuthIframe] Unknown message type received from Atlas:', event.data.type);
            }
        };

        window.addEventListener('message', handleMessage);
        // Очистка слушателя
        return () => window.removeEventListener('message', handleMessage);
    }, []); // Пустой массив зависимостей, т.к. функции API и константы не меняются

    // --- JSX Рендеринг iframe ---
    return (
        <div style={{ position: 'relative' }}>
            {/* Индикатор загрузки/обработки */}
            {isProcessing && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(255,255,255,0.7)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 10
                }}>
                    {/* Можно использовать Spin из Ant Design */}
                    <div>Processing...</div>
                </div>
            )}
            {/* Iframe */}
            <iframe
                src={src}
                style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    // Можно немного затемнить iframe во время обработки
                    opacity: isProcessing ? 0.6 : 1
                }}
                scrolling="no"
                title={`Atlas ${mode === 'login' ? 'Login' : 'Registration'}`}
            />
        </div>
    );
};

export default AuthIframe;
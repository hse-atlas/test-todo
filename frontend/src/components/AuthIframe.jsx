import React, { useState, useEffect } from 'react';
// Убираем import { register as registerLocalUser } from '../api'; - он больше не нужен здесь

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(400);
    // isProcessing можно оставить для визуального фидбека, пока Atlas работает,
    // но основная логика обработки (API + навигация) теперь в App.jsx
    const [isProcessing, setIsProcessing] = useState(false);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;
    const atlasOrigin = 'https://atlas.appweb.space'; // Выносим origin для безопасности

    useEffect(() => {
        const handleMessage = async (event) => {
            // Строгая проверка origin для безопасности
            if (event.origin !== atlasOrigin) {
                console.warn('Message received from unexpected origin:', event.origin);
                return;
            }

            console.log('Received message from Atlas:', event.data);

            // Обработка изменения высоты iframe
            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
                return;
            }

            // Обработка успешной авторизации (логин или регистрация)
            if (event.data.type === 'ATLAS_AUTH_SUCCESS' || event.data.type === 'ATLAS_REGISTER_SUCCESS') {
                setIsProcessing(true); // Показываем индикатор, пока Atlas завершает

                const { tokens, user } = event.data;

                // Проверка наличия необходимых данных
                if (!tokens?.access_token || !tokens?.refresh_token || !user?.id || !user?.email) {
                    console.error('Invalid data structure received from Atlas:', event.data);
                    alert('Authentication failed: Invalid data received.'); // Уведомление пользователю
                    setIsProcessing(false);
                    return;
                }

                // --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ---
                // Отправляем сообщение родительскому окну (App.jsx)
                // с токенами и данными пользователя для дальнейшей обработки
                window.parent.postMessage({
                    type: 'ATLAS_AUTH_COMPLETE',
                    tokens: tokens,
                    user: { // Отправляем только нужные поля
                        id: user.id,
                        email: user.email,
                        username: user.username || ''
                    }
                }, window.location.origin); // Отправляем на свой же origin

                // Здесь НЕ делаем:
                // - localStorage.setItem(...)
                // - вызов registerLocalUser(...)
                // - window.location.href = '/'

                // Можно убрать индикатор, т.к. родительский компонент возьмет управление
                setIsProcessing(false); // Или оставить, если хочется показать оверлей дольше
            } else if (event.data.type === 'ATLAS_AUTH_ERROR') {
                // Обработка ошибок от Atlas, если нужно
                console.error('Atlas authentication error:', event.data.error);
                alert(`Authentication failed: ${event.data.error?.message || 'Unknown error'}`);
                setIsProcessing(false);
            }
            else {
                console.warn('Unknown message type received from Atlas:', event.data.type);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
        // Зависимости не нужны, projectId и mode используются только для генерации src
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            {isProcessing && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(255,255,255,0.7)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 10
                }}>
                    {/* Можно добавить Spin из antd */}
                    <div>Processing...</div>
                </div>
            )}
            <iframe
                src={src}
                style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    opacity: isProcessing ? 0.5 : 1 // Слегка затемняем iframe во время обработки
                }}
                scrolling="no"
                title={`Atlas ${mode === 'login' ? 'Login' : 'Registration'}`}
            />
        </div>
    );
};

export default AuthIframe;
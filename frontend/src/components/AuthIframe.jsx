import React, { useState, useEffect } from 'react';
import { Spin, message } from 'antd';
import { registerOAuthUser } from '../api';

const AuthIframe = ({ projectId, mode = 'login' }) => {
    const [iframeHeight, setIframeHeight] = useState(600);
    const [isProcessing, setIsProcessing] = useState(false);
    const src = `https://atlas.appweb.space/embed/${mode}/${projectId}`;
    const atlasOrigin = 'https://atlas.appweb.space';

    const handleOAuthRegistration = async (userData) => {
        setIsProcessing(true);
        try {
            // 1. Регистрируем пользователя через OAuth эндпоинт
            const registeredUser = await registerOAuthUser({
                external_user_id: userData.id,
                email: userData.email,
                username: userData.username || `user_${userData.id}`,
                oauth_provider: userData.oauth_provider || 'unknown'
            });

            // 2. Отправляем успешный результат родительскому окну
            window.parent.postMessage({
                type: 'OAUTH_REGISTRATION_SUCCESS',
                payload: {
                    user: registeredUser,
                    tokens: {
                        access_token: registeredUser.access_token,
                        refresh_token: registeredUser.refresh_token
                    }
                }
            }, window.location.origin);

        } catch (error) {
            console.error('OAuth registration failed:', error);

            // 3. Отправляем ошибку родительскому окну
            window.parent.postMessage({
                type: 'OAUTH_REGISTRATION_ERROR',
                error: {
                    message: error.response?.data?.message || 'Registration failed',
                    details: error.response?.data?.details || error.message
                }
            }, window.location.origin);

            message.error('OAuth registration failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFormRegistration = async (userData) => {
        setIsProcessing(true);
        try {
            // Здесь будет вызов API для обычной регистрации
            // Это пример - реализуйте свой API вызов
            window.parent.postMessage({
                type: 'FORM_REGISTRATION_SUCCESS',
                payload: userData
            }, window.location.origin);

        } catch (error) {
            window.parent.postMessage({
                type: 'FORM_REGISTRATION_ERROR',
                error: {
                    message: 'Form registration failed',
                    details: error.message
                }
            }, window.location.origin);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        const handleMessage = async (event) => {
            // Безопасная проверка origin
            if (event.origin !== atlasOrigin) {
                console.warn('Message from untrusted origin:', event.origin);
                return;
            }

            console.log('Received message from Atlas:', event.data);

            // Обработка изменения высоты iframe
            if (event.data.type === 'ATLAS_IFRAME_HEIGHT') {
                setIframeHeight(event.data.height);
                return;
            }

            // Обработка OAuth регистрации
            if (event.data.type === 'ATLAS_OAUTH_REGISTER_SUCCESS') {
                await handleOAuthRegistration(event.data.user);
                return;
            }

            // Обработка обычной регистрации через форму
            if (event.data.type === 'ATLAS_FORM_REGISTER_SUCCESS') {
                await handleFormRegistration(event.data.user);
                return;
            }

            // Обработка успешного входа (OAuth или форма)
            if (event.data.type === 'ATLAS_AUTH_SUCCESS') {
                window.parent.postMessage({
                    type: 'ATLAS_AUTH_COMPLETE',
                    payload: event.data.tokens
                }, window.location.origin);
                return;
            }

            // Обработка ошибок
            if (event.data.type === 'ATLAS_AUTH_ERROR') {
                window.parent.postMessage({
                    type: 'ATLAS_AUTH_ERROR',
                    error: event.data.error
                }, window.location.origin);
                return;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            {isProcessing && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <Spin size="large" tip="Processing..." />
                </div>
            )}

            <iframe
                src={src}
                style={{
                    width: '100%',
                    height: `${iframeHeight}px`,
                    border: 'none',
                    borderRadius: '8px',
                    opacity: isProcessing ? 0.7 : 1,
                    transition: 'opacity 0.3s ease'
                }}
                scrolling="no"
                title={`Atlas ${mode === 'login' ? 'Login' : 'Registration'}`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            />
        </div>
    );
};

export default AuthIframe;
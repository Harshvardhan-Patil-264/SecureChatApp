import React from 'react';
import './UltraSecureChat.css';

const ModalDialog = ({ isOpen, type = 'info', title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', showCancel = false }) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            case 'lockdown': return '🔒';
            default: return 'ℹ️';
        }
    };

    const getHeaderClass = () => {
        switch (type) {
            case 'success': return 'uss-modal-header-success';
            case 'error': return 'uss-modal-header-error';
            case 'lockdown': return 'uss-modal-header-critical';
            case 'warning': return 'uss-modal-header-warning';
            default: return 'uss-modal-header';
        }
    };

    return (
        <div className="uss-modal-overlay">
            <div className="uss-modal uss-dialog-modal">
                <div className={`uss-modal-header ${getHeaderClass()}`}>
                    <div className="uss-dialog-icon">{getIcon()}</div>
                    <h2>{title}</h2>
                </div>

                <div className="uss-modal-body">
                    <p className="uss-dialog-message">{message}</p>
                </div>

                <div className="uss-modal-footer">
                    {showCancel && (
                        <button className="uss-btn-cancel" onClick={onCancel}>
                            {cancelText}
                        </button>
                    )}
                    <button className="uss-btn-primary" onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalDialog;

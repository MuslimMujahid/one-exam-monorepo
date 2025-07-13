import React, { useEffect, useState } from 'react';

interface NotificationProps {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
}

export function Notification({
  show,
  message,
  type = 'success',
  duration = 3000,
  onClose,
}: NotificationProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);

    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!visible) return null;

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type];

  const icon = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2`}
    >
      <span role="img" aria-label={type}>
        {icon}
      </span>
      <span>{message}</span>
    </div>
  );
}

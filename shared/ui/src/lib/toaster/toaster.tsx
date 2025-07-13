'use client';

import { Toaster as Sonner, ToasterProps } from 'sonner';
import './toaster.css';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      {...props}
    />
  );
};

export { Toaster };

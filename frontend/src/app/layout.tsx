'use client';

import { Geist, Geist_Mono } from "next/font/google";
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store';
import AuthProvider from '@/components/AuthProvider';
import MessagingProvider from '@/components/messaging/MessagingProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-[#1A1D23]`}>
        <Provider store={store}>
          <AuthProvider>
            <MessagingProvider>
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#2A2D35',
                    color: '#fff',
                    border: '1px solid #374151',
                  },
                  success: {
                    style: {
                      background: '#065f46',
                      border: '1px solid #10b981',
                    },
                  },
                  error: {
                    style: {
                      background: '#7f1d1d',
                      border: '1px solid #ef4444',
                    },
                  },
                }}
              />
            </MessagingProvider>
          </AuthProvider>
        </Provider>
      </body>
    </html>
  );
}
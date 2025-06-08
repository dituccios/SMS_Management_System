import type { Metadata } from 'next';
import { Inter, Lato } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const lato = Lato({
  weight: ['100', '300', '400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SMS Management System',
    template: '%s | SMS Management',
  },
  description: 'Comprehensive Safety Management System for enterprise organizations. Manage documents, workflows, incidents, training, and compliance in one platform.',
  keywords: [
    'safety management',
    'SMS',
    'compliance',
    'risk assessment',
    'incident management',
    'document management',
    'workflow automation',
    'training management',
  ],
  authors: [
    {
      name: 'SMS Management Team',
      url: 'https://sms-management.com',
    },
  ],
  creator: 'SMS Management System',
  publisher: 'SMS Management System',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://sms-management.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sms-management.com',
    siteName: 'SMS Management System',
    title: 'SMS Management System - Comprehensive Safety Management',
    description: 'Enterprise-grade Safety Management System with document management, workflow automation, incident tracking, and compliance monitoring.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SMS Management System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SMS Management System',
    description: 'Comprehensive Safety Management System for enterprise organizations.',
    images: ['/og-image.png'],
    creator: '@smsmanagement',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${lato.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
                style: {
                  background: '#ef4444',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#fff',
                },
                style: {
                  background: '#3b82f6',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

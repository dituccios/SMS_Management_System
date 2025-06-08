'use client';

import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { Elements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { loadStripe } from '@stripe/stripe-js';
import { ThemeProvider } from 'next-themes';
// Simple fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// PayPal configuration
const paypalOptions = {
  'client-id': process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
  currency: 'EUR',
  intent: 'subscription',
  'data-client-token': 'sandbox_client_token',
};

// Stripe appearance configuration
const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#2563eb',
    colorBackground: '#ffffff',
    colorText: '#1f2937',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px',
  },
  rules: {
    '.Input': {
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '14px',
    },
    '.Input:focus': {
      borderColor: '#2563eb',
      boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
    },
    '.Label': {
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px',
    },
  },
};

// SWR configuration
const swrConfig = {
  fetcher,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: (error: any) => {
    // Don't retry on 4xx errors
    return error.status >= 500;
  },
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  onError: (error: any) => {
    console.error('SWR Error:', error);
    
    // Handle authentication errors
    if (error.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/auth/signin';
    }
  },
  onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
    // Never retry on 404
    if (error.status === 404) return;
    
    // Never retry on authentication errors
    if (error.status === 401) return;
    
    // Only retry up to 3 times
    if (retryCount >= 3) return;
    
    // Retry after 5 seconds
    setTimeout(() => revalidate({ retryCount }), 5000);
  },
};

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <SWRConfig value={swrConfig}>
          <Elements
            stripe={stripePromise}
            options={{
              appearance: stripeAppearance,
              locale: 'en',
            }}
          >
            <PayPalScriptProvider options={paypalOptions}>
              {children}
            </PayPalScriptProvider>
          </Elements>
        </SWRConfig>
      </ThemeProvider>
    </SessionProvider>
  );
}

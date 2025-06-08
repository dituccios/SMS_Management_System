'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Download, 
  Shield, 
  Users, 
  HardDrive, 
  Calendar,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { PaymentMethodForm } from '@/components/payment/PaymentMethodForm';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { UsageChart } from '@/components/charts/UsageChart';
import { InvoiceList } from '@/components/subscription/InvoiceList';
import { apiService } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SubscriptionPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: subscription, error: subscriptionError, mutate: mutateSubscription } = useSWR(
    '/subscription',
    () => apiService.subscription.get().then(res => res.data.data.subscription)
  );
  
  const { data: usage } = useSWR(
    '/subscription/usage',
    () => apiService.subscription.getUsage().then(res => res.data.data)
  );
  
  const { data: paymentMethods } = useSWR(
    '/subscription/payment-methods',
    () => apiService.paymentMethods.getAll().then(res => res.data.data.paymentMethods)
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'usage', label: 'Usage & Billing', icon: HardDrive },
    { id: 'payment', label: 'Payment Methods', icon: CreditCard },
    { id: 'download', label: 'Download', icon: Download },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600 bg-green-100';
      case 'TRIAL': return 'text-blue-600 bg-blue-100';
      case 'PAST_DUE': return 'text-yellow-600 bg-yellow-100';
      case 'CANCELED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (subscriptionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load subscription
          </h2>
          <p className="text-gray-600">
            Please try refreshing the page or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Subscription Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your SMS Professional subscription and billing
                </p>
              </div>
              {subscription && (
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(subscription.status)}`}>
                    {subscription.status}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(subscription.amount, subscription.currency)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Subscription Overview */}
              <SubscriptionCard subscription={subscription} />
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Users</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {usage?.currentUsage?.users || 0}
                        <span className="text-sm font-normal text-gray-500">/100</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <HardDrive className="h-8 w-8 text-green-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Storage Used</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(usage?.currentUsage?.storageGB || 0).toFixed(1)}
                        <span className="text-sm font-normal text-gray-500">GB/1TB</span>
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-purple-500" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Next Billing</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {subscription?.currentPeriodEnd 
                          ? formatDate(subscription.currentPeriodEnd)
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features List */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  SMS Professional Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'Unlimited Documents & Version Control',
                    'Advanced Workflow Automation',
                    'Incident Management & Reporting',
                    'Training Program Management',
                    'Risk Assessment Tools',
                    'Compliance Monitoring',
                    '24/7 Priority Support',
                    'API Access & Integrations',
                    'Advanced Analytics & Reporting',
                    'Multi-user Collaboration',
                    'Document Digital Signatures',
                    'Automated Compliance Reports'
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* Usage Charts */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Usage Overview
                </h3>
                <UsageChart data={usage?.usageHistory} />
              </div>
              
              {/* Billing History */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Invoices
                </h3>
                <InvoiceList />
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              {/* Payment Methods */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Payment Methods
                </h3>
                <PaymentMethodForm 
                  paymentMethods={paymentMethods}
                  onUpdate={() => mutateSubscription()}
                />
              </div>
            </div>
          )}

          {activeTab === 'download' && (
            <div className="space-y-6">
              {/* Download Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Download SMS Management System
                </h3>
                <p className="text-gray-600 mb-6">
                  Download and install the SMS Management System on your infrastructure.
                  Available for Windows, macOS, Linux, and Docker.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { platform: 'Windows', icon: '🪟', size: '245 MB' },
                    { platform: 'macOS', icon: '🍎', size: '198 MB' },
                    { platform: 'Linux', icon: '🐧', size: '156 MB' },
                    { platform: 'Docker', icon: '🐳', size: '892 MB' },
                  ].map((item) => (
                    <div key={item.platform} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="text-center">
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <h4 className="font-semibold text-gray-900">{item.platform}</h4>
                        <p className="text-sm text-gray-500 mb-3">{item.size}</p>
                        <button className="w-full btn-primary flex items-center justify-center space-x-2">
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Installation Guide</h4>
                      <p className="text-blue-700 text-sm mt-1">
                        Need help with installation? Check our comprehensive installation guide
                        with step-by-step instructions for all platforms.
                      </p>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2">
                        View Installation Guide →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

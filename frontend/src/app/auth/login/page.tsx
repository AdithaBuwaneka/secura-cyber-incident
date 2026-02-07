'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Shield, Mail, Lock } from 'lucide-react';
import { loginUser, clearError } from '@/store/auth/authSlice';
import { RootState, AppDispatch } from '@/store';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Navbar, Footer } from '@/components/layout';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    try {
      await dispatch(loginUser(formData)).unwrap();
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error as string);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00D4FF]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0EA5E9]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="login" />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-3 min-[400px]:px-4 py-8 min-[400px]:py-12">
        <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6 lg:gap-8 items-center lg:items-stretch justify-center">
          {/* Login Form Container */}
          <div className="w-full max-w-md">
          {/* Login Form Card */}
          <div className="bg-[#2A2D35]/80 backdrop-blur-sm p-5 min-[400px]:p-6 sm:p-8 rounded-lg border border-gray-700">
            {/* Header inside card */}
            <div className="text-center mb-5 min-[400px]:mb-6">
              <div className="flex items-center justify-center mb-3">
                <Shield className="h-10 w-10 min-[400px]:h-12 min-[400px]:w-12 text-[#00D4FF]" />
              </div>
              <h1 className="text-xl min-[400px]:text-2xl font-bold text-white mb-1">Welcome to Secura</h1>
              <p className="text-gray-400 text-xs min-[400px]:text-sm">AI-Powered Security Incident Management</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 min-[400px]:space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 min-[400px]:pl-12 pr-4 py-2.5 min-[400px]:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-sm min-[400px]:text-base"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 min-[400px]:pl-12 pr-10 min-[400px]:pr-12 py-2.5 min-[400px]:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-sm min-[400px]:text-base"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00D4FF] text-[#1A1D23] py-2.5 min-[400px]:py-3 px-4 rounded-lg font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm min-[400px]:text-base"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1A1D23] mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-4 min-[400px]:mt-5 text-center">
              <p className="text-gray-400 text-sm min-[400px]:text-base">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-[#00D4FF] hover:underline font-medium">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
          </div>

          {/* Demo Accounts - Right side on large screens, below on small */}
          <div className="w-full max-w-md lg:max-w-[260px]">
            <div className="bg-[#2A2D35]/60 backdrop-blur-sm p-4 min-[400px]:p-5 rounded-lg border border-gray-700 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🔐</span>
                <h3 className="text-white font-semibold text-sm">Demo Accounts</h3>
              </div>
              <p className="text-gray-500 text-[10px] min-[400px]:text-xs mb-3">Click to copy email</p>

              <div className="space-y-2 flex-1 flex flex-col justify-between">
                <div
                  onClick={() => navigator.clipboard.writeText('employee1@secura.com')}
                  className="bg-[#1A1D23]/50 p-2.5 min-[400px]:p-3 rounded border border-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">👤</span>
                    <span className="text-blue-300 font-medium text-xs min-[400px]:text-sm">Employee</span>
                  </div>
                  <p className="text-gray-400 text-[10px] min-[400px]:text-xs truncate">employee1@secura.com</p>
                  <p className="text-gray-500 text-[10px] min-[400px]:text-xs">SecuraEmployee123!</p>
                </div>

                <div
                  onClick={() => navigator.clipboard.writeText('security.lead@secura.com')}
                  className="bg-[#1A1D23]/50 p-2.5 min-[400px]:p-3 rounded border border-orange-500/20 hover:border-orange-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🛡️</span>
                    <span className="text-orange-300 font-medium text-xs min-[400px]:text-sm">Security Lead</span>
                  </div>
                  <p className="text-gray-400 text-[10px] min-[400px]:text-xs truncate">security.lead@secura.com</p>
                  <p className="text-gray-500 text-[10px] min-[400px]:text-xs">SecuraSecLead123!</p>
                </div>

                <div
                  onClick={() => navigator.clipboard.writeText('analyst1@secura.com')}
                  className="bg-[#1A1D23]/50 p-2.5 min-[400px]:p-3 rounded border border-orange-500/20 hover:border-orange-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🛡️</span>
                    <span className="text-orange-300 font-medium text-xs min-[400px]:text-sm">Analyst</span>
                  </div>
                  <p className="text-gray-400 text-[10px] min-[400px]:text-xs truncate">analyst1@secura.com</p>
                  <p className="text-gray-500 text-[10px] min-[400px]:text-xs">SecuraAnalyst123!</p>
                </div>

                <div
                  onClick={() => navigator.clipboard.writeText('admin@secura.com')}
                  className="bg-[#1A1D23]/50 p-2.5 min-[400px]:p-3 rounded border border-purple-500/20 hover:border-purple-500/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">👨‍💼</span>
                    <span className="text-purple-300 font-medium text-xs min-[400px]:text-sm">Admin</span>
                  </div>
                  <p className="text-gray-400 text-[10px] min-[400px]:text-xs truncate">admin@secura.com</p>
                  <p className="text-gray-500 text-[10px] min-[400px]:text-xs">SecuraAdmin123!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Chatbot Widget */}
      <ChatbotWidget pageContext="login" position="bottom-right" />
    </div>
  );
}

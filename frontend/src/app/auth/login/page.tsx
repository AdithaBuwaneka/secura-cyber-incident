'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Shield, Mail, Lock, ArrowLeft } from 'lucide-react';
import { loginUser, clearError } from '@/store/auth/authSlice';
import { RootState, AppDispatch } from '@/store';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
    <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-gray-400 hover:text-[#00D4FF] transition-colors duration-300 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-[#00D4FF]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Secura</h1>
          <p className="text-gray-400">AI-Powered Security Incident Management</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
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
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full pl-12 pr-12 py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
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
              className="w-full bg-[#00D4FF] text-[#1A1D23] py-3 px-4 rounded-lg font-medium hover:bg-[#00C4EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-[#00D4FF] hover:underline font-medium">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* User Role Badges */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm mb-4">Available User Roles:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs flex items-center">
              👤 Employee - Report incidents easily
            </span>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs flex items-center">
              🛡️ Security Team - Investigate threats
            </span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs flex items-center">
              🔑 Admin - Manage system & users
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
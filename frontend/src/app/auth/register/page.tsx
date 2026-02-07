'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Shield, Mail, Lock, User, Phone } from 'lucide-react';
import { registerUser, clearError } from '@/store/auth/authSlice';
import { RootState, AppDispatch } from '@/store';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Navbar, Footer } from '@/components/layout';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: ''
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

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = await dispatch(registerUser({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber?.trim() || undefined
    }));

    if (registerUser.fulfilled.match(result)) {
      toast.success('Account created successfully!');
      dispatch(clearError());
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } else {
      const err = result.payload;
      if (isAuthenticated) {
        toast.success('Account created successfully!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
        return;
      }

      let errorMessage = 'Registration failed. Please try again.';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        const errorObj = err as { message?: string; payload?: string | object; error?: { message?: string } };
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.payload) {
          errorMessage = typeof errorObj.payload === 'string' ? errorObj.payload : 'Registration failed';
        } else if (errorObj.error && errorObj.error.message) {
          errorMessage = errorObj.error.message;
        }
      }
      toast.error(errorMessage);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00D4FF]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0EA5E9]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="register" />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-3 min-[400px]:px-4 py-6 min-[400px]:py-8 sm:py-12">
        <div className="w-full max-w-2xl relative">
          {/* Header */}
          <div className="text-center mb-4 min-[400px]:mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-2 min-[400px]:mb-3 sm:mb-4">
              <Shield className="h-8 w-8 min-[400px]:h-10 min-[400px]:w-10 sm:h-12 sm:w-12 text-[#00D4FF]" />
            </div>
            <h1 className="text-xl min-[400px]:text-2xl sm:text-3xl font-bold text-white mb-1 min-[400px]:mb-2">Join Secura</h1>
            <p className="text-gray-400 text-xs min-[400px]:text-sm sm:text-base">Create your account to start reporting incidents</p>
          </div>

          {/* Register Form */}
          <div className="bg-[#2A2D35]/80 backdrop-blur-sm p-4 min-[400px]:p-5 sm:p-6 md:p-8 rounded-lg border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-4 min-[400px]:space-y-5 sm:space-y-6">
              {/* Full Name and Email Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-[400px]:gap-5 sm:gap-6">
                <div>
                  <label htmlFor="fullName" className="block text-xs min-[400px]:text-sm font-medium text-white mb-1.5 min-[400px]:mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 text-gray-400" />
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className="w-full pl-9 min-[400px]:pl-10 sm:pl-12 pr-3 min-[400px]:pr-4 py-2 min-[400px]:py-2.5 sm:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-xs min-[400px]:text-sm sm:text-base"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs min-[400px]:text-sm font-medium text-white mb-1.5 min-[400px]:mb-2">
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
                      className="w-full pl-9 min-[400px]:pl-10 sm:pl-12 pr-3 min-[400px]:pr-4 py-2 min-[400px]:py-2.5 sm:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-xs min-[400px]:text-sm sm:text-base"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
              </div>

              {/* Info about roles */}
              <div className="bg-[#1A1D23] p-3 min-[400px]:p-4 rounded-lg border border-gray-600">
                <p className="text-gray-300 text-xs min-[400px]:text-sm">
                  <strong>Note:</strong> New registrations are automatically assigned as employees.
                  To join the security team, submit an application after registration.
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-xs min-[400px]:text-sm font-medium text-white mb-1.5 min-[400px]:mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 text-gray-400" />
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full pl-9 min-[400px]:pl-10 sm:pl-12 pr-3 min-[400px]:pr-4 py-2 min-[400px]:py-2.5 sm:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-xs min-[400px]:text-sm sm:text-base"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Password Fields Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-[400px]:gap-5 sm:gap-6">
                <div>
                  <label htmlFor="password" className="block text-xs min-[400px]:text-sm font-medium text-white mb-1.5 min-[400px]:mb-2">
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
                      className="w-full pl-9 min-[400px]:pl-10 sm:pl-12 pr-9 min-[400px]:pr-10 sm:pr-12 py-2 min-[400px]:py-2.5 sm:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-xs min-[400px]:text-sm sm:text-base"
                      placeholder="Min 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5" /> : <Eye className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs min-[400px]:text-sm font-medium text-white mb-1.5 min-[400px]:mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full pl-9 min-[400px]:pl-10 sm:pl-12 pr-9 min-[400px]:pr-10 sm:pr-12 py-2 min-[400px]:py-2.5 sm:py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors text-xs min-[400px]:text-sm sm:text-base"
                      placeholder="Confirm password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5" /> : <Eye className="h-4 w-4 min-[400px]:h-5 min-[400px]:w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-2.5 min-[400px]:p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-red-400 text-xs min-[400px]:text-sm">
                    {typeof error === 'string' ? error : 'An error occurred during registration'}
                  </p>
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
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-4 min-[400px]:mt-6 text-center">
              <p className="text-gray-400 text-xs min-[400px]:text-sm sm:text-base">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-[#00D4FF] hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Chatbot Widget */}
      <ChatbotWidget pageContext="register" position="bottom-right" />
    </div>
  );
}

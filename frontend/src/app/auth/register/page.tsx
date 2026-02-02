'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, Shield, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';
import { registerUser, clearError } from '@/store/auth/authSlice';
import { RootState, AppDispatch } from '@/store';
import Link from 'next/link';
import originalToast from 'react-hot-toast';

// Debug wrapper for toast
const toast = {
  success: (message: string, options?: Parameters<typeof originalToast.success>[1]) => {
    console.log('REGISTER PAGE TOAST SUCCESS:', message, typeof message);
    return originalToast.success(message, options);
  },
  error: (message: string, options?: Parameters<typeof originalToast.error>[1]) => {
    console.log('REGISTER PAGE TOAST ERROR:', message, typeof message);
    return originalToast.error(message, options);
  }
};

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
    
    console.log('Starting registration...');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    console.log('Form data before registration:', formData);
    console.log('Phone number value:', formData.phoneNumber);
    console.log('Phone number length:', formData.phoneNumber?.length);
    
    const result = await dispatch(registerUser({
      email: formData.email,
      password: formData.password,
      fullName: formData.fullName,
      phoneNumber: formData.phoneNumber?.trim() || undefined
    }));
    
    if (registerUser.fulfilled.match(result)) {
      console.log('Registration successful, showing success toast');
      toast.success('Account created successfully!');
      // Clear any residual errors
      dispatch(clearError());
      
      // Small delay to ensure Redux state is updated before navigation
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    } else {
      const error = result.payload;
      console.log('Registration error type:', typeof error);
      console.log('Registration error:', error);
      console.log('Registration error keys:', error ? Object.keys(error) : 'no keys');
      
      // Only show error toast if registration actually failed
      // Check if user was created despite the error
      if (isAuthenticated) {
        console.log('User is authenticated despite error - treating as success');
        toast.success('Account created successfully!');
        
        // Small delay to ensure Redux state is updated before navigation
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
        return;
      }
      
      // Handle Redux Toolkit rejection value
      let errorMessage = 'Registration failed. Please try again.';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Redux Toolkit rejection values are often nested
        const errorObj = error as { 
          message?: string; 
          payload?: string | object; 
          error?: { message?: string } 
        };
        
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.payload) {
          errorMessage = typeof errorObj.payload === 'string' ? errorObj.payload : 'Registration failed';
        } else if (errorObj.error && errorObj.error.message) {
          errorMessage = errorObj.error.message;
        } else {
          errorMessage = 'Registration failed. Please try again.';
        }
      }
      
      console.log('Final error message:', errorMessage);
      console.log('About to show error toast with:', errorMessage);
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
    <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
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
          <h1 className="text-3xl font-bold text-white mb-2">Join Secura</h1>
          <p className="text-gray-400">Create your account to start reporting incidents</p>
        </div>

        {/* Register Form */}
        <div className="bg-[#2A2D35] p-8 rounded-lg border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name and Email Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

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
            </div>

            {/* Info about roles */}
            <div className="bg-[#1A1D23] p-4 rounded-lg border border-gray-600">
              <p className="text-gray-300 text-sm">
                <strong>Note:</strong> New registrations are automatically assigned as employees. 
                To join the security team, you must submit an application with proof documents after registration. 
                An admin will review and approve your role change.
              </p>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-white mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Password Fields Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-12 pr-12 py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] transition-colors"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">
                  {typeof error === 'string' ? error : 'An error occurred during registration'}
                </p>
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[#00D4FF] hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Shield, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Save
} from 'lucide-react';
import { RootState, AppDispatch } from '@/store';
import { updateUserProfile } from '@/store/auth/authSlice';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
  const { userProfile, loading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    country: '',
    city: '',
    home_number: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (userProfile) {
      console.log('DEBUG: Full userProfile data:', JSON.stringify(userProfile, null, 2));
      console.log('DEBUG: Phone number field value:', userProfile.phone_number);
      console.log('DEBUG: Phone number type:', typeof userProfile.phone_number);
      console.log('DEBUG: Country:', userProfile.country);
      console.log('DEBUG: City:', userProfile.city);
      console.log('DEBUG: Home number:', userProfile.home_number);
      console.log('DEBUG: Available fields:', Object.keys(userProfile));
      
      setFormData(prev => ({
        ...prev,
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        phone_number: userProfile.phone_number?.toString() || '',
        country: userProfile.country || '',
        city: userProfile.city || '',
        home_number: userProfile.home_number || ''
      }));
      
      console.log('DEBUG: Form data after update:', {
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        phone_number: userProfile.phone_number || '',
        country: userProfile.country || '',
        city: userProfile.city || '',
        home_number: userProfile.home_number || ''
      });
    }
  }, [userProfile]);

  const validatePhoneNumber = (phone: string): string => {
    if (!phone) return ''; // Allow empty phone number
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Check if it's a valid phone number (7-15 digits)
    if (cleaned.length < 7 || cleaned.length > 15) {
      return 'Phone number must be between 7 and 15 digits';
    }
    
    // Check if it contains only digits
    if (!/^\d+$/.test(cleaned)) {
      return 'Phone number can only contain digits';
    }
    
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Validate phone number in real-time
    if (name === 'phone_number') {
      const phoneError = validatePhoneNumber(value);
      setErrors(prev => ({
        ...prev,
        phone_number: phoneError
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate form fields
      const newErrors: {[key: string]: string} = {};
      
      // Validate full name
      if (!formData.full_name.trim()) {
        newErrors.full_name = 'Full name is required';
      }
      
      // Validate phone number
      const phoneError = validatePhoneNumber(formData.phone_number);
      if (phoneError) {
        newErrors.phone_number = phoneError;
      }
      
      // Validate address fields
      if (!formData.country.trim()) {
        newErrors.country = 'Country is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.home_number.trim()) {
        newErrors.home_number = 'Home number is required';
      }
      
      // If there are validation errors, don't submit
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setIsSubmitting(false);
        return;
      }

      // Update profile
      const updateData = {
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim(),
        country: formData.country.trim(),
        city: formData.city.trim(),
        home_number: formData.home_number.trim()
      };

      await dispatch(updateUserProfile(updateData)).unwrap();
      toast.success('Profile updated successfully');

      setErrors({});
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('DEBUG: Profile update error:', error);
      if (err.message && err.message.includes('Current password is incorrect')) {
        toast.error('Current password is incorrect');
        setErrors(prev => ({
          ...prev,
          current_password: 'Current password is incorrect'
        }));
      } else {
        toast.error(err.message || 'Failed to update profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00D4FF] mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1D23]">
      {/* Header */}
      <header className="bg-[#2A2D35] border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Back Button */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard" 
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Shield className="h-8 w-8 text-[#00D4FF]" />
              <div>
                <h1 className="text-xl font-bold text-white">Edit Profile</h1>
                <p className="text-xs text-gray-400">Update your account information</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#2A2D35] rounded-lg border border-gray-700 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
                         {/* Profile Picture Section */}
             <div className="flex items-center space-x-6 mb-8">
               <div className="relative">
                 <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center text-white font-semibold text-xl border-4 border-gray-600">
                   {userProfile?.full_name ? (
                     userProfile.full_name.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2)
                   ) : (
                     'EM'
                   )}
                 </div>
               </div>
               <div>
                 <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
                 <p className="text-sm text-gray-400">Your profile picture shows your initials</p>
               </div>
             </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-[#00D4FF]" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 bg-[#1A1D23] border rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-[#00D4FF] transition-colors ${
                      errors.full_name 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-gray-600 focus:border-[#00D4FF]'
                    }`}
                    placeholder="Enter your full name"
                    required
                  />
                  {errors.full_name && (
                    <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1D23] border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                      placeholder="email@example.com"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 bg-[#1A1D23] border rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-[#00D4FF] transition-colors ${
                        errors.phone_number 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-gray-600 focus:border-[#00D4FF]'
                      }`}
                      placeholder="Enter your phone number (e.g., 1234567890)"
                    />
                  </div>
                  {errors.phone_number && (
                    <p className="text-red-400 text-xs mt-1">{errors.phone_number}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Optional - Enter digits only (7-15 digits)</p>
                </div>
              </div>
            </div>

                         {/* Address Information */}
             <div className="space-y-4 pt-6 border-t border-gray-600">
               <h3 className="text-lg font-semibold text-white flex items-center">
                 <User className="h-5 w-5 mr-2 text-[#00D4FF]" />
                 Address Information
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">
                     Country
                   </label>
                   <input
                     type="text"
                     name="country"
                     value={formData.country}
                     onChange={handleInputChange}
                     className={`w-full px-4 py-3 bg-[#1A1D23] border rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-[#00D4FF] transition-colors ${
                       errors.country 
                         ? 'border-red-500 focus:border-red-500' 
                         : 'border-gray-600 focus:border-[#00D4FF]'
                     }`}
                     placeholder="Enter your country"
                     required
                   />
                   {errors.country && (
                     <p className="text-red-400 text-xs mt-1">{errors.country}</p>
                   )}
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">
                     City
                   </label>
                   <input
                     type="text"
                     name="city"
                     value={formData.city}
                     onChange={handleInputChange}
                     className={`w-full px-4 py-3 bg-[#1A1D23] border rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-[#00D4FF] transition-colors ${
                       errors.city 
                         ? 'border-red-500 focus:border-red-500' 
                         : 'border-gray-600 focus:border-[#00D4FF]'
                     }`}
                     placeholder="Enter your city"
                     required
                   />
                   {errors.city && (
                     <p className="text-red-400 text-xs mt-1">{errors.city}</p>
                   )}
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-300 mb-2">
                     Home Number
                   </label>
                   <input
                     type="text"
                     name="home_number"
                     value={formData.home_number}
                     onChange={handleInputChange}
                     className={`w-full px-4 py-3 bg-[#1A1D23] border rounded-lg text-white placeholder-gray-400 focus:ring-1 focus:ring-[#00D4FF] transition-colors ${
                       errors.home_number 
                         ? 'border-red-500 focus:border-red-500' 
                         : 'border-gray-600 focus:border-[#00D4FF]'
                     }`}
                     placeholder="Enter your home number"
                     required
                   />
                   {errors.home_number && (
                     <p className="text-red-400 text-xs mt-1">{errors.home_number}</p>
                   )}
                 </div>
               </div>
             </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-[#00D4FF] text-[#1A1D23] rounded-lg hover:bg-[#00C4EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 
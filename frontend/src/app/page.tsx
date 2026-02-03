'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, AlertTriangle, Users, BarChart3, Zap, Lock, Globe, ArrowRight, CheckCircle, Menu, X } from 'lucide-react';

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00D4FF]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0EA5E9]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3B82F6]/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header - Fixed navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1E293B]/95 backdrop-blur-xl border-b border-[#334155]/50">
        <div className="max-w-7xl mx-auto px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12 min-[400px]:h-14 md:h-16">
            {/* Logo */}
            <div className="flex items-center group flex-shrink-0">
              <div className="relative">
                <Shield className="h-6 w-6 min-[400px]:h-7 min-[400px]:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-[#00D4FF] mr-1.5 min-[400px]:mr-2 sm:mr-2.5 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[#00D4FF]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <h1 className="text-lg min-[400px]:text-xl sm:text-2xl md:text-[1.7rem] font-bold bg-gradient-to-r from-white to-[#00D4FF] bg-clip-text text-transparent">
                Secura
              </h1>
            </div>

            {/* Desktop Navigation - shows at 640px+ */}
            <nav className="hidden sm:flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-6">
              <Link href="/auth/login" className="text-gray-300 hover:text-[#00D4FF] transition-all duration-300 font-medium px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-[#00D4FF]/10 text-sm md:text-base">
                Login
              </Link>
              <Link href="/auth/register" className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-[#00D4FF]/25 hover:scale-105 text-sm md:text-base whitespace-nowrap">
                Get Started
              </Link>
            </nav>

            {/* Mobile Menu Button - shows below 640px */}
            <button
              className="sm:hidden p-1.5 min-[400px]:p-2 rounded-lg text-gray-300 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10 transition-all duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5 min-[400px]:h-6 min-[400px]:w-6" /> : <Menu className="h-5 w-5 min-[400px]:h-6 min-[400px]:w-6" />}
            </button>
          </div>

          {/* Mobile Navigation Dropdown */}
          <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-40 pb-3 min-[400px]:pb-4' : 'max-h-0'}`}>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/auth/login"
                className="text-gray-300 hover:text-[#00D4FF] transition-all duration-300 font-medium px-3 min-[400px]:px-4 py-2.5 min-[400px]:py-3 rounded-lg hover:bg-[#00D4FF]/10 text-center text-sm min-[400px]:text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-4 min-[400px]:px-6 py-2.5 min-[400px]:py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-[#00D4FF]/25 text-center text-sm min-[400px]:text-base"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-12 min-[400px]:h-14 md:h-16"></div>

      {/* Hero Section */}
      <main className="relative max-w-7xl mx-auto px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="py-12 min-[400px]:py-16 sm:py-20 md:py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-3 min-[400px]:px-4 py-1.5 min-[400px]:py-2 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-6 min-[400px]:mb-8 backdrop-blur-sm">
            <Zap className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF] mr-1.5 min-[400px]:mr-2" />
            <span className="text-xs min-[400px]:text-sm font-medium text-[#00D4FF]">AI-Powered Security Platform</span>
          </div>

          <h2 className="text-3xl min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 min-[400px]:mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
              Enterprise Security
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#0EA5E9] to-[#3B82F6] bg-clip-text text-transparent">
              Incident Management
            </span>
          </h2>

          <p className="text-base min-[400px]:text-lg sm:text-xl text-gray-300 mb-8 min-[400px]:mb-10 sm:mb-12 max-w-4xl mx-auto leading-relaxed">
            Transform your cybersecurity response with AI-powered incident analysis, real-time collaboration,
            and intelligent threat detection. Reduce response times by <span className="text-[#00D4FF] font-semibold">75%</span> and
            improve accuracy by <span className="text-[#00D4FF] font-semibold">90%</span>.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 min-[400px]:gap-6 mb-12 min-[400px]:mb-16">
            <Link href="/auth/register" className="group bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-6 min-[400px]:px-8 py-3 min-[400px]:py-4 rounded-xl font-semibold text-base min-[400px]:text-lg transition-all duration-300 shadow-2xl hover:shadow-[#00D4FF]/30 hover:scale-105 flex items-center justify-center">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link href="/auth/login" className="border-2 border-[#334155] hover:border-[#00D4FF] px-6 min-[400px]:px-8 py-3 min-[400px]:py-4 rounded-xl font-semibold text-base min-[400px]:text-lg transition-all duration-300 hover:bg-[#00D4FF]/10 backdrop-blur-sm">
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 min-[400px]:gap-6 sm:gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-2xl min-[400px]:text-3xl font-bold text-[#00D4FF] mb-1 min-[400px]:mb-2">75%</div>
              <div className="text-gray-400 text-xs min-[400px]:text-sm sm:text-base">Faster Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl min-[400px]:text-3xl font-bold text-[#00D4FF] mb-1 min-[400px]:mb-2">90%</div>
              <div className="text-gray-400 text-xs min-[400px]:text-sm sm:text-base">Improved Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl min-[400px]:text-3xl font-bold text-[#00D4FF] mb-1 min-[400px]:mb-2">60%</div>
              <div className="text-gray-400 text-xs min-[400px]:text-sm sm:text-base">Cost Reduction</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="py-12 min-[400px]:py-16 sm:py-20 md:py-24">
          <div className="text-center mb-10 min-[400px]:mb-12 sm:mb-16">
            <h3 className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-bold mb-3 min-[400px]:mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Revolutionary Features
            </h3>
            <p className="text-gray-400 text-sm min-[400px]:text-base sm:text-lg max-w-2xl mx-auto">
              Cutting-edge technology meets intuitive design for unparalleled security management
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#00D4FF]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#00D4FF]/20">
              <div className="relative mb-6">
                <AlertTriangle className="h-14 w-14 text-[#00D4FF] group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[#00D4FF]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white group-hover:text-[#00D4FF] transition-colors duration-300">
                Smart AI Reporting
              </h4>
              <p className="text-gray-300 leading-relaxed">
                AI-powered incident categorization with real-time severity assessment and intelligent recommendations
              </p>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#0EA5E9]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#0EA5E9]/20">
              <div className="relative mb-6">
                <Users className="h-14 w-14 text-[#0EA5E9] group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[#0EA5E9]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white group-hover:text-[#0EA5E9] transition-colors duration-300">
                Team Collaboration
              </h4>
              <p className="text-gray-300 leading-relaxed">
                Secure messaging and real-time updates between security teams with encrypted communication
              </p>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#3B82F6]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#3B82F6]/20">
              <div className="relative mb-6">
                <BarChart3 className="h-14 w-14 text-[#3B82F6] group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[#3B82F6]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white group-hover:text-[#3B82F6] transition-colors duration-300">
                Advanced Analytics
              </h4>
              <p className="text-gray-300 leading-relaxed">
                Executive dashboards with predictive threat intelligence and comprehensive reporting
              </p>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#10B981]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#10B981]/20">
              <div className="relative mb-6">
                <Shield className="h-14 w-14 text-[#10B981] group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-[#10B981]/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <h4 className="text-xl font-bold mb-3 text-white group-hover:text-[#10B981] transition-colors duration-300">
                Enterprise Security
              </h4>
              <p className="text-gray-300 leading-relaxed">
                Role-based access control, end-to-end encryption, and comprehensive compliance reporting
              </p>
            </div>
          </div>
        </div>

        {/* User Roles Section */}
        <div className="py-24">
          <div className="text-center mb-16">
            <h3 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Built for Every Role
            </h3>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Tailored experiences that empower every team member to contribute to your organization&apos;s security
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#00D4FF]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#00D4FF]/20">
              <div className="text-center">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">👤</div>
                <h4 className="text-2xl font-bold mb-3 text-[#00D4FF] group-hover:text-white transition-colors duration-300">
                  EMPLOYEE
                </h4>
                <p className="text-gray-300 mb-6 text-lg italic">&quot;Report incidents easily&quot;</p>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#00D4FF] mr-3 flex-shrink-0" />
                    <span>Submit security incident reports</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#00D4FF] mr-3 flex-shrink-0" />
                    <span>Upload evidence files securely</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#00D4FF] mr-3 flex-shrink-0" />
                    <span>Track incident status in real-time</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#00D4FF] mr-3 flex-shrink-0" />
                    <span>Apply for security team membership</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#0EA5E9]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#0EA5E9]/20">
              <div className="text-center">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🛡️</div>
                <h4 className="text-2xl font-bold mb-3 text-[#0EA5E9] group-hover:text-white transition-colors duration-300">
                  SECURITY TEAM
                </h4>
                <p className="text-gray-300 mb-6 text-lg italic">&quot;Investigate and resolve incidents&quot;</p>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#0EA5E9] mr-3 flex-shrink-0" />
                    <span>View all organization incidents</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#0EA5E9] mr-3 flex-shrink-0" />
                    <span>Use AI-powered analysis tools</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#0EA5E9] mr-3 flex-shrink-0" />
                    <span>Real-time team collaboration</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#0EA5E9] mr-3 flex-shrink-0" />
                    <span>Generate security reports</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#10B981]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#10B981]/20">
              <div className="text-center">
                <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">🔑</div>
                <h4 className="text-2xl font-bold mb-3 text-[#10B981] group-hover:text-white transition-colors duration-300">
                  ADMIN
                </h4>
                <p className="text-gray-300 mb-6 text-lg italic">&quot;Manage system and users&quot;</p>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#10B981] mr-3 flex-shrink-0" />
                    <span>Review security team applications</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#10B981] mr-3 flex-shrink-0" />
                    <span>Manage user roles & permissions</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#10B981] mr-3 flex-shrink-0" />
                    <span>Access executive dashboards</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-4 w-4 text-[#10B981] mr-3 flex-shrink-0" />
                    <span>Generate compliance reports</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-24 text-center">
          <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#0EA5E9]/10 rounded-3xl p-12 border border-[#00D4FF]/20 backdrop-blur-sm">
            <h3 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Ready to Transform Your Security?
            </h3>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Join thousands of organizations already protecting their digital assets with Secura&apos;s intelligent security platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/auth/register" className="group bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-2xl hover:shadow-[#00D4FF]/30 hover:scale-105 flex items-center justify-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link href="/auth/login" className="border-2 border-[#334155] hover:border-[#00D4FF] px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 hover:bg-[#00D4FF]/10 backdrop-blur-sm">
                Sign In to Your Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative bg-gradient-to-r from-[#1E293B]/90 to-[#334155]/90 border-t border-[#334155]/50 backdrop-blur-xl mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-[#00D4FF] mr-3" />
                <span className="text-2xl font-bold bg-gradient-to-r from-white to-[#00D4FF] bg-clip-text text-transparent">
                  Secura
                </span>
              </div>
              <p className="text-gray-400 mb-4">
                Enterprise-grade cybersecurity incident management powered by AI and designed for the modern workplace.
              </p>
              <div className="flex space-x-4">
                <div className="w-8 h-8 bg-[#00D4FF]/20 rounded-full flex items-center justify-center hover:bg-[#00D4FF]/30 transition-colors cursor-pointer">
                  <Globe className="h-4 w-4 text-[#00D4FF]" />
                </div>
                <div className="w-8 h-8 bg-[#00D4FF]/20 rounded-full flex items-center justify-center hover:bg-[#00D4FF]/30 transition-colors cursor-pointer">
                  <Lock className="h-4 w-4 text-[#00D4FF]" />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Features</li>
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Security</li>
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Analytics</li>
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Integrations</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">About Us</li>
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Contact</li>
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Privacy Policy</li>
                <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Terms of Service</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[#334155]/50 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-gray-400">© 2026 Secura. All rights reserved.</span>
            </div>
            <div className="text-gray-400">
              <span className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] bg-clip-text text-transparent font-semibold">
                Enterprise Security Solutions
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
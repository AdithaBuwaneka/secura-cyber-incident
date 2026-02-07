'use client';

import Link from 'next/link';
import { Shield, AlertTriangle, Users, BarChart3, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { Navbar, Footer } from '@/components/layout';
import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00D4FF]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#0EA5E9]/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3B82F6]/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Navbar */}
      <Navbar currentPage="home" />

      {/* Hero Section */}
      <main className="flex-1 relative max-w-7xl mx-auto px-3 min-[400px]:px-4 sm:px-6 lg:px-8">
        <div className="py-12 min-[400px]:py-16 sm:py-20 md:py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-3 min-[400px]:px-4 py-1.5 min-[400px]:py-2 rounded-full bg-[#00D4FF]/10 border border-[#00D4FF]/20 mb-6 min-[400px]:mb-8 backdrop-blur-sm">
            <Zap className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF] mr-1.5 min-[400px]:mr-2" />
            <span className="text-xs min-[400px]:text-sm font-medium text-[#00D4FF]">AI-Powered Security Platform</span>
          </div>

          <h2 className="text-3xl min-[400px]:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 min-[400px]:mb-8 leading-tight pb-1">
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent inline-block pb-1">
              Enterprise Security
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#00D4FF] via-[#0EA5E9] to-[#3B82F6] bg-clip-text text-transparent inline-block pb-1">
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
            <h3 className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-bold mb-3 min-[400px]:mb-4 pb-1">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Revolutionary Features</span>
            </h3>
            <p className="text-gray-400 text-sm min-[400px]:text-base sm:text-lg max-w-2xl mx-auto">
              Cutting-edge technology meets intuitive design for unparalleled security management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 min-[400px]:gap-6 sm:gap-8">
            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#00D4FF]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#00D4FF]/20">
              <div className="relative mb-4 min-[400px]:mb-6">
                <AlertTriangle className="h-10 w-10 min-[400px]:h-12 min-[400px]:w-12 sm:h-14 sm:w-14 text-[#00D4FF] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h4 className="text-base min-[400px]:text-lg sm:text-xl font-bold mb-2 min-[400px]:mb-3 text-white group-hover:text-[#00D4FF] transition-colors duration-300">
                Smart AI Reporting
              </h4>
              <p className="text-gray-300 leading-relaxed text-xs min-[400px]:text-sm sm:text-base">
                AI-powered incident categorization with real-time severity assessment
              </p>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#0EA5E9]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#0EA5E9]/20">
              <div className="relative mb-4 min-[400px]:mb-6">
                <Users className="h-10 w-10 min-[400px]:h-12 min-[400px]:w-12 sm:h-14 sm:w-14 text-[#0EA5E9] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h4 className="text-base min-[400px]:text-lg sm:text-xl font-bold mb-2 min-[400px]:mb-3 text-white group-hover:text-[#0EA5E9] transition-colors duration-300">
                Team Collaboration
              </h4>
              <p className="text-gray-300 leading-relaxed text-xs min-[400px]:text-sm sm:text-base">
                Secure messaging and real-time updates between security teams
              </p>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#3B82F6]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#3B82F6]/20">
              <div className="relative mb-4 min-[400px]:mb-6">
                <BarChart3 className="h-10 w-10 min-[400px]:h-12 min-[400px]:w-12 sm:h-14 sm:w-14 text-[#3B82F6] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h4 className="text-base min-[400px]:text-lg sm:text-xl font-bold mb-2 min-[400px]:mb-3 text-white group-hover:text-[#3B82F6] transition-colors duration-300">
                Advanced Analytics
              </h4>
              <p className="text-gray-300 leading-relaxed text-xs min-[400px]:text-sm sm:text-base">
                Executive dashboards with predictive threat intelligence
              </p>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#10B981]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#10B981]/20">
              <div className="relative mb-4 min-[400px]:mb-6">
                <Shield className="h-10 w-10 min-[400px]:h-12 min-[400px]:w-12 sm:h-14 sm:w-14 text-[#10B981] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h4 className="text-base min-[400px]:text-lg sm:text-xl font-bold mb-2 min-[400px]:mb-3 text-white group-hover:text-[#10B981] transition-colors duration-300">
                Enterprise Security
              </h4>
              <p className="text-gray-300 leading-relaxed text-xs min-[400px]:text-sm sm:text-base">
                Role-based access control and end-to-end encryption
              </p>
            </div>
          </div>
        </div>

        {/* User Roles Section */}
        <div className="py-12 min-[400px]:py-16 sm:py-20 md:py-24">
          <div className="text-center mb-10 min-[400px]:mb-12 sm:mb-16">
            <h3 className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-bold mb-3 min-[400px]:mb-4 pb-1">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Built for Every Role</span>
            </h3>
            <p className="text-gray-400 text-sm min-[400px]:text-base sm:text-lg max-w-2xl mx-auto">
              Tailored experiences that empower every team member to contribute to your organization&apos;s security
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 min-[400px]:gap-6 sm:gap-8">
            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#00D4FF]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#00D4FF]/20">
              <div className="text-center">
                <div className="text-4xl min-[400px]:text-5xl sm:text-6xl mb-4 min-[400px]:mb-6 group-hover:scale-110 transition-transform duration-300">👤</div>
                <h4 className="text-lg min-[400px]:text-xl sm:text-2xl font-bold mb-2 min-[400px]:mb-3 text-[#00D4FF] group-hover:text-white transition-colors duration-300">
                  EMPLOYEE
                </h4>
                <p className="text-gray-300 mb-4 min-[400px]:mb-6 text-sm min-[400px]:text-base sm:text-lg italic">&quot;Report incidents easily&quot;</p>
                <div className="space-y-2 min-[400px]:space-y-3 text-left">
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Submit incident reports</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Upload evidence securely</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Track status real-time</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#0EA5E9]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#0EA5E9]/20">
              <div className="text-center">
                <div className="text-4xl min-[400px]:text-5xl sm:text-6xl mb-4 min-[400px]:mb-6 group-hover:scale-110 transition-transform duration-300">🛡️</div>
                <h4 className="text-lg min-[400px]:text-xl sm:text-2xl font-bold mb-2 min-[400px]:mb-3 text-[#0EA5E9] group-hover:text-white transition-colors duration-300">
                  SECURITY TEAM
                </h4>
                <p className="text-gray-300 mb-4 min-[400px]:mb-6 text-sm min-[400px]:text-base sm:text-lg italic">&quot;Investigate threats&quot;</p>
                <div className="space-y-2 min-[400px]:space-y-3 text-left">
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#0EA5E9] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">View all incidents</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#0EA5E9] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">AI-powered analysis</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#0EA5E9] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Team collaboration</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-gradient-to-br from-[#1E293B]/80 to-[#334155]/50 p-4 min-[400px]:p-6 sm:p-8 rounded-2xl border border-[#334155]/50 backdrop-blur-sm hover:border-[#10B981]/50 transition-all duration-500 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-[#10B981]/20">
              <div className="text-center">
                <div className="text-4xl min-[400px]:text-5xl sm:text-6xl mb-4 min-[400px]:mb-6 group-hover:scale-110 transition-transform duration-300">🔑</div>
                <h4 className="text-lg min-[400px]:text-xl sm:text-2xl font-bold mb-2 min-[400px]:mb-3 text-[#10B981] group-hover:text-white transition-colors duration-300">
                  ADMIN
                </h4>
                <p className="text-gray-300 mb-4 min-[400px]:mb-6 text-sm min-[400px]:text-base sm:text-lg italic">&quot;Manage system&quot;</p>
                <div className="space-y-2 min-[400px]:space-y-3 text-left">
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#10B981] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Review applications</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#10B981] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Manage user roles</span>
                  </div>
                  <div className="flex items-center text-gray-300 group-hover:text-white transition-colors duration-300">
                    <CheckCircle className="h-3 w-3 min-[400px]:h-4 min-[400px]:w-4 text-[#10B981] mr-2 min-[400px]:mr-3 flex-shrink-0" />
                    <span className="text-xs min-[400px]:text-sm sm:text-base">Executive dashboards</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-12 min-[400px]:py-16 sm:py-20 md:py-24 text-center">
          <div className="bg-gradient-to-r from-[#00D4FF]/10 to-[#0EA5E9]/10 rounded-2xl min-[400px]:rounded-3xl p-6 min-[400px]:p-8 sm:p-12 border border-[#00D4FF]/20 backdrop-blur-sm">
            <h3 className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 min-[400px]:mb-6 pb-1">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Ready to Transform Your Security?</span>
            </h3>
            <p className="text-base min-[400px]:text-lg sm:text-xl text-gray-300 mb-6 min-[400px]:mb-8 max-w-3xl mx-auto">
              Join thousands of organizations already protecting their digital assets with Secura&apos;s intelligent security platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 min-[400px]:gap-6">
              <Link href="/auth/register" className="group bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] hover:from-[#0EA5E9] hover:to-[#3B82F6] px-6 min-[400px]:px-8 py-3 min-[400px]:py-4 rounded-xl font-semibold text-base min-[400px]:text-lg transition-all duration-300 shadow-2xl hover:shadow-[#00D4FF]/30 hover:scale-105 flex items-center justify-center">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4 min-[400px]:h-5 min-[400px]:w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link href="/auth/login" className="border-2 border-[#334155] hover:border-[#00D4FF] px-6 min-[400px]:px-8 py-3 min-[400px]:py-4 rounded-xl font-semibold text-base min-[400px]:text-lg transition-all duration-300 hover:bg-[#00D4FF]/10 backdrop-blur-sm">
                Sign In to Your Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Chatbot Widget */}
      <ChatbotWidget pageContext="home" position="bottom-right" />
    </div>
  );
}

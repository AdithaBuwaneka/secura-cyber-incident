'use client';

import { Shield, Globe, Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-r from-[#1E293B]/90 to-[#334155]/90 border-t border-[#334155]/50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 min-[400px]:px-4 sm:px-6 lg:px-8 py-6 min-[400px]:py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 min-[400px]:gap-8 mb-6 min-[400px]:mb-8">
          {/* Brand Section */}
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start mb-3 min-[400px]:mb-4">
              <Shield className="h-6 w-6 min-[400px]:h-8 min-[400px]:w-8 text-[#00D4FF] mr-2 min-[400px]:mr-3" />
              <span className="text-xl min-[400px]:text-2xl font-bold bg-gradient-to-r from-white to-[#00D4FF] bg-clip-text text-transparent">
                Secura
              </span>
            </div>
            <p className="text-gray-400 text-xs min-[400px]:text-sm mb-3 min-[400px]:mb-4">
              Enterprise-grade cybersecurity incident management powered by AI.
            </p>
            <div className="flex justify-center sm:justify-start space-x-3 min-[400px]:space-x-4">
              <div className="w-7 h-7 min-[400px]:w-8 min-[400px]:h-8 bg-[#00D4FF]/20 rounded-full flex items-center justify-center hover:bg-[#00D4FF]/30 transition-colors cursor-pointer">
                <Globe className="h-3.5 w-3.5 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF]" />
              </div>
              <div className="w-7 h-7 min-[400px]:w-8 min-[400px]:h-8 bg-[#00D4FF]/20 rounded-full flex items-center justify-center hover:bg-[#00D4FF]/30 transition-colors cursor-pointer">
                <Lock className="h-3.5 w-3.5 min-[400px]:h-4 min-[400px]:w-4 text-[#00D4FF]" />
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div className="text-center sm:text-left">
            <h4 className="text-white font-semibold mb-3 min-[400px]:mb-4 text-sm min-[400px]:text-base">Platform</h4>
            <ul className="space-y-1.5 min-[400px]:space-y-2 text-gray-400 text-xs min-[400px]:text-sm">
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Features</li>
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Security</li>
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Analytics</li>
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Integrations</li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="text-center sm:text-left">
            <h4 className="text-white font-semibold mb-3 min-[400px]:mb-4 text-sm min-[400px]:text-base">Company</h4>
            <ul className="space-y-1.5 min-[400px]:space-y-2 text-gray-400 text-xs min-[400px]:text-sm">
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">About Us</li>
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Contact</li>
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Privacy Policy</li>
              <li className="hover:text-[#00D4FF] transition-colors cursor-pointer">Terms of Service</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#334155]/50 pt-4 min-[400px]:pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-2 min-[400px]:gap-4">
          <span className="text-gray-400 text-xs min-[400px]:text-sm">© 2026 Secura. All rights reserved.</span>
          <span className="bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] bg-clip-text text-transparent font-semibold text-xs min-[400px]:text-sm">
            Enterprise Security Solutions
          </span>
        </div>
      </div>
    </footer>
  );
}

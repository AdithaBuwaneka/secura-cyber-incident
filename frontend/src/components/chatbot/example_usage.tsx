/*
Example: How to add chatbot to a page
*/

import ChatbotWidget from '@/components/chatbot/ChatbotWidget';

export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your page content */}
      <div className="container mx-auto p-8">
        <h1>Example Page</h1>
        <p>Your page content here...</p>
      </div>
      
      {/* Add chatbot widget - it will appear as a floating button */}
      <ChatbotWidget 
        pageContext="example"  // Current page name
        position="bottom-right"  // or "bottom-left"
      />
    </div>
  );
}

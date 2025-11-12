import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, FileText, Shield, CreditCard, Users, Settings, MessageCircle, BookOpen } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
  category: string;
}

interface HelpCategory {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQ[] = [
    {
      question: "How do I submit a new insurance claim?",
      answer: "To submit a new claim, navigate to the 'Claims' section from the main dashboard and click 'New Claim'. Fill in all required fields including policy details, incident information, and upload supporting documents. Once submitted, you'll receive a claim reference number for tracking.",
      category: "Claims"
    },
    {
      question: "What types of insurance policies are supported?",
      answer: "Our system supports Sea Export, Sea Import, Air Import, and Inland transportation insurance policies. Each policy type has specific forms and requirements tailored to the shipping method and coverage type.",
      category: "Policies"
    },
    {
      question: "How do I track the status of my claim?",
      answer: "You can track your claim status from the main dashboard. Each claim shows real-time status updates including 'Pending', 'Under Review', 'Approved', or 'Rejected'. Click on any claim to view detailed timeline and status history.",
      category: "Claims"
    },
    {
      question: "What documents are required for claim submission?",
      answer: "Required documents typically include: Bill of Lading, Commercial Invoice, Packing List, Survey Report, and photographs of damaged goods. Additional documents may be required based on the claim type and policy coverage.",
      category: "Documents"
    },
    {
      question: "How long does the claim approval process take?",
      answer: "Standard claims are typically processed within 5-7 business days. Complex claims requiring additional investigation may take 10-15 business days. You'll receive email notifications at each stage of the review process.",
      category: "Claims"
    },
    {
      question: "Can I edit a claim after submission?",
      answer: "Claims can be edited within 24 hours of submission if they haven't been assigned to a surveyor. After assignment, you'll need to contact your assigned surveyor or admin to request modifications.",
      category: "Claims"
    },
    {
      question: "How do I calculate fee bills automatically?",
      answer: "The Fee Bill Details section includes auto-calculation features. Enter the base amounts and the system will automatically calculate GST, totals, and other derived values based on configured formulas.",
      category: "Billing"
    },
    {
      question: "What are the different user roles and permissions?",
      answer: "The system has two main roles: Admins (full access to all features, user management, and system settings) and Regular Users (can create and manage their own claims, view assigned tasks). Contact your admin for role changes.",
      category: "Users"
    },
    {
      question: "How do I reset my password?",
      answer: "Click 'Forgot Password' on the login page, enter your registered email, and you'll receive a password reset link. Follow the link to create a new password. For security, reset links expire after 1 hour.",
      category: "Account"
    },
    {
      question: "Can I export claims data to Excel?",
      answer: "Yes, you can export claims data from the dashboard. Click the 'Export' button and select your preferred format (Excel or CSV). You can also filter data before exporting to get specific subsets.",
      category: "Reports"
    },
    {
      question: "How does the document AI extraction work?",
      answer: "Upload your document (PDF or image), and our AI-powered system using Gemini AI will automatically extract relevant fields like policy numbers, dates, amounts, and party details. You can review and edit the extracted data before saving.",
      category: "Documents"
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use industry-standard encryption, Row Level Security (RLS) policies, and secure authentication. All data is stored in Supabase with automatic backups. User access is role-based and logged for audit purposes.",
      category: "Security"
    }
  ];

  const categories: HelpCategory[] = [
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Getting Started",
      description: "Learn the basics of using the insurance claims system"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "User Guide",
      description: "Comprehensive guides for all features and workflows"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Security & Privacy",
      description: "Understanding data protection and security measures"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "Billing & Payments",
      description: "Fee calculations, invoicing, and payment processes"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "User Management",
      description: "Managing users, roles, and permissions"
    },
    {
      icon: <Settings className="w-6 h-6" />,
      title: "Settings & Configuration",
      description: "Customize your workspace and preferences"
    }
  ];

  const faqCategories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-3">How can we help you?</h1>
          <p className="text-lg text-blue-100 mb-6">Search our knowledge base below</p>
          
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for help articles, FAQs, guides..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-2xl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Help Categories Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div
                key={index}
                className="group bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-400"
              >
                <div className="flex items-start space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-2.5 rounded-lg group-hover:scale-105 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 text-xs">{category.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <MessageCircle className="w-8 h-8 text-blue-600" />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {faqCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>

          {/* FAQ Items */}
          <div className="space-y-3">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No FAQs found matching your search.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors duration-300"
                  >
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 mb-1">{faq.question}</h3>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {faq.category}
                      </span>
                    </div>
                    {expandedFAQ === index ? (
                      <ChevronUp className="w-4 h-4 text-blue-600 flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-4" />
                    )}
                  </button>
                  
                  {expandedFAQ === index && (
                    <div className="px-4 pb-4 bg-gradient-to-r from-gray-50 to-blue-50">
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-gray-700 text-sm leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Support Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white text-center shadow-xl">
          <h2 className="text-2xl font-bold mb-3">Still need help?</h2>
          <p className="text-base text-blue-100 mb-6">Our support team is here to assist you</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
              Contact Support
            </button>
            <button className="bg-blue-500 bg-opacity-30 backdrop-blur-sm text-white border-2 border-white px-6 py-2.5 rounded-xl font-semibold hover:bg-opacity-40 transition-all duration-300 hover:scale-105">
              Schedule a Demo
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="text-3xl mb-2">📚</div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Documentation</h3>
            <p className="text-gray-600 text-xs">Complete system documentation and API references</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="text-3xl mb-2">🎥</div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Video Tutorials</h3>
            <p className="text-gray-600 text-xs">Step-by-step video guides for all features</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Community Forum</h3>
            <p className="text-gray-600 text-xs">Connect with other users and share tips</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;

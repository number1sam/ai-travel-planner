'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  FileText, 
  Clock, 
  Shield, 
  CreditCard, 
  Users, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  Print,
  Mail
} from 'lucide-react'

interface TermsSection {
  id: string
  title: string
  icon: any
  content: string[]
  important?: boolean
}

export default function TermsPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('acceptance')
  const [showTableOfContents, setShowTableOfContents] = useState(true)

  const lastUpdated = '15th January 2024'
  const effectiveDate = '1st February 2024'

  const termsSections: TermsSection[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      icon: Shield,
      content: [
        'By accessing and using the AI Travel & Health Planner service ("Service"), you accept and agree to be bound by the terms and provision of this agreement.',
        'If you do not agree to abide by the above, please do not use this service.',
        'These Terms of Service constitute the entire agreement between you and AI Travel Planner Ltd regarding the use of the Service.',
        'We reserve the right to update and change the Terms of Service from time to time without notice. Any new features that augment or enhance the current Service shall be subject to the Terms of Service.'
      ],
      important: true
    },
    {
      id: 'description',
      title: '2. Description of Service',
      icon: FileText,
      content: [
        'AI Travel & Health Planner is a comprehensive travel planning platform that uses artificial intelligence to create personalized travel itineraries.',
        'The Service includes but is not limited to: AI-powered trip planning, health tracking integration, payment processing, social sharing features, and customer support.',
        'The Service is provided on an "as is" and "as available" basis. We make no representations or warranties of any kind, express or implied.',
        'You understand and agree that the Service is provided for informational and planning purposes only. Final booking decisions and health-related choices remain your responsibility.'
      ]
    },
    {
      id: 'accounts',
      title: '3. User Accounts and Registration',
      icon: Users,
      content: [
        'To access certain features of the Service, you must register for an account and provide accurate, current, and complete information.',
        'You are responsible for safeguarding the password and for keeping your account information current.',
        'You are fully responsible for all activities that occur under your account, whether or not you have knowledge of such activities.',
        'You must immediately notify us of any unauthorized use of your account or any other breach of security.',
        'We reserve the right to refuse service, terminate accounts, or remove or edit content in our sole discretion.'
      ]
    },
    {
      id: 'subscription',
      title: '4. Subscription and Payment Terms',
      icon: CreditCard,
      content: [
        'The Service is offered on a subscription basis with different pricing tiers: Free, Premium (£9.99/month), and Pro (£19.99/month).',
        'Subscription fees are billed in advance on a monthly or annual basis and are non-refundable except as required by law.',
        'All fees are exclusive of all taxes, levies, or duties imposed by taxing authorities, and you shall be responsible for payment of all such taxes.',
        'We reserve the right to change our pricing at any time. Price changes will be communicated 30 days in advance.',
        'You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period.',
        'Failed payments may result in suspension or termination of your account after a grace period of 7 days.'
      ],
      important: true
    },
    {
      id: 'acceptable-use',
      title: '5. Acceptable Use Policy',
      icon: AlertTriangle,
      content: [
        'You agree not to use the Service for any unlawful purposes or to conduct any unlawful activity.',
        'You agree not to attempt to gain unauthorized access to any portion of the Service or any other systems or networks connected to the Service.',
        'You agree not to transmit any worms, viruses, or any code of a destructive nature.',
        'You agree not to use the Service to harass, abuse, or harm another person or entity.',
        'You agree not to use the Service to impersonate any person or entity, or falsely state or misrepresent your affiliation with a person or entity.',
        'Violation of this policy may result in immediate termination of your account.'
      ],
      important: true
    },
    {
      id: 'privacy',
      title: '6. Privacy and Data Protection',
      icon: Shield,
      content: [
        'Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.',
        'We collect and process personal data in accordance with GDPR and other applicable privacy laws.',
        'We implement appropriate technical and organizational measures to protect your personal data.',
        'You have the right to access, correct, delete, or port your personal data at any time.',
        'We use encryption to protect sensitive information such as payment details and health data.',
        'Data retention periods vary by data type and are detailed in our Privacy Policy.'
      ]
    },
    {
      id: 'health-data',
      title: '7. Health Data and Medical Information',
      icon: Shield,
      content: [
        'The Service may collect and process health-related information from connected devices and user input.',
        'Health information is provided for informational purposes only and should not be considered medical advice.',
        'You should always consult with qualified healthcare professionals for medical advice and treatment.',
        'We are not responsible for any health-related decisions made based on information provided by the Service.',
        'Health data is encrypted and stored securely in compliance with healthcare data protection standards.',
        'You may delete your health data at any time through your account settings.'
      ],
      important: true
    },
    {
      id: 'intellectual-property',
      title: '8. Intellectual Property Rights',
      icon: FileText,
      content: [
        'The Service and its original content, features, and functionality are owned by AI Travel Planner Ltd and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.',
        'You may not reproduce, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Service.',
        'User-generated content remains your property, but you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content.',
        'You represent and warrant that you own or have the necessary rights to all content you submit.',
        'We respect the intellectual property rights of others and expect our users to do the same.'
      ]
    },
    {
      id: 'limitation-liability',
      title: '9. Limitation of Liability',
      icon: AlertTriangle,
      content: [
        'In no event shall AI Travel Planner Ltd, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.',
        'Our total liability to you for all damages, losses, and causes of action shall not exceed the amount paid by you to us in the 12 months prior to the claim.',
        'Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential or incidental damages, so the above limitations may not apply to you.',
        'Nothing in these terms excludes or limits our liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation.'
      ],
      important: true
    },
    {
      id: 'third-party-services',
      title: '10. Third-Party Services and APIs',
      icon: Users,
      content: [
        'The Service integrates with various third-party services including payment processors, travel booking platforms, and health tracking devices.',
        'We are not responsible for the availability, accuracy, or reliability of third-party services.',
        'Your use of third-party services is subject to their respective terms of service and privacy policies.',
        'We may suspend or terminate integration with third-party services at any time without notice.',
        'Third-party services may change their terms, pricing, or availability, which may affect the functionality of our Service.'
      ]
    },
    {
      id: 'termination',
      title: '11. Termination',
      icon: AlertTriangle,
      content: [
        'We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever.',
        'If you wish to terminate your account, you may simply discontinue using the Service or contact us to request account deletion.',
        'Upon termination, your right to use the Service will cease immediately. All provisions that by their nature should survive termination shall survive.',
        'Termination does not relieve you of any obligations incurred prior to termination.',
        'We will retain your data for a period of 30 days after termination to allow for account recovery, after which it will be permanently deleted.'
      ]
    },
    {
      id: 'governing-law',
      title: '12. Governing Law and Dispute Resolution',
      icon: FileText,
      content: [
        'These Terms shall be interpreted and governed by the laws of England and Wales, without regard to conflict of law provisions.',
        'Any dispute arising from or relating to the subject matter of these Terms shall be finally settled by arbitration in London, England.',
        'You agree to submit to the personal jurisdiction of the courts located in London, England for any actions not subject to arbitration.',
        'If any provision of these Terms is found to be unenforceable, the remainder shall be enforced to the fullest extent possible.',
        'The prevailing party in any dispute shall be entitled to recover reasonable attorneys\' fees and costs.'
      ]
    },
    {
      id: 'changes',
      title: '13. Changes to Terms',
      icon: Clock,
      content: [
        'We reserve the right to modify or replace these Terms at any time at our sole discretion.',
        'If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.',
        'Material changes will be communicated via email and through in-app notifications.',
        'Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.',
        'It is your responsibility to review these Terms periodically for changes.'
      ]
    },
    {
      id: 'contact',
      title: '14. Contact Information',
      icon: Mail,
      content: [
        'If you have any questions about these Terms of Service, please contact us:',
        'Email: legal@travelplanner.com',
        'Address: AI Travel Planner Ltd, 123 Business Street, London, EC1A 1BB, United Kingdom',
        'Phone: +44 20 7123 4567',
        'Our legal team will respond to inquiries within 5 business days.'
      ]
    }
  ]

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId)
  }

  const printTerms = () => {
    window.print()
  }

  const downloadTerms = () => {
    // In real implementation, this would generate and download a PDF
    alert('Terms of Service PDF download would start here')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm" style={{ height: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-brand-green to-brand-seafoam rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Terms of Service</h1>
              <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={printTerms}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Print className="w-4 h-4" />
              Print
            </button>
            <button 
              onClick={downloadTerms}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="text-brand-green hover:text-brand-seafoam transition-colors font-medium"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Table of Contents */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Table of Contents</h3>
                <button
                  onClick={() => setShowTableOfContents(!showTableOfContents)}
                  className="lg:hidden"
                >
                  {showTableOfContents ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              </div>
              
              {(showTableOfContents || window.innerWidth >= 1024) && (
                <div className="space-y-2">
                  {termsSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 text-left rounded-xl transition-colors ${
                        expandedSection === section.id
                          ? 'bg-brand-green text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <section.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{section.title}</span>
                      {section.important && (
                        <AlertTriangle className="w-3 h-3 text-orange-500 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Important Notice */}
              <div className="mt-6 p-4 bg-orange-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-orange-900">Important</span>
                </div>
                <p className="text-sm text-orange-700">
                  Please read all terms carefully. Sections marked with ⚠️ contain critical information about your rights and obligations.
                </p>
              </div>

              {/* Effective Date */}
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-900">Effective Date</span>
                </div>
                <p className="text-sm text-blue-700">
                  These terms become effective on {effectiveDate}
                </p>
              </div>
            </div>
          </div>

          {/* Terms Content */}
          <div className="lg:col-span-3">
            {/* Introduction */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8 mb-8"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h2>
              
              <div className="prose prose-gray max-w-none">
                <p className="text-lg text-gray-600 mb-6">
                  Welcome to AI Travel & Health Planner. These Terms of Service ("Terms") govern your access to and use of our website, mobile application, and related services (collectively, the "Service") provided by AI Travel Planner Ltd.
                </p>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-900">Please Read Carefully</span>
                  </div>
                  <p className="text-yellow-700">
                    By using our Service, you agree to these Terms. If you disagree with any part of these terms, then you may not access the Service.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2">Last Updated</h4>
                    <p className="text-gray-600">{lastUpdated}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2">Effective Date</h4>
                    <p className="text-gray-600">{effectiveDate}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Terms Sections */}
            <div className="space-y-6">
              {termsSections.map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        section.important ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <section.icon className={`w-5 h-5 ${
                          section.important ? 'text-orange-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                        {section.important && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span className="text-sm text-orange-600 font-medium">Important Section</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {expandedSection === section.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {expandedSection === section.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 pb-6"
                    >
                      <div className="space-y-4">
                        {section.content.map((paragraph, idx) => (
                          <p key={idx} className="text-gray-600 leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-white rounded-3xl shadow-xl p-8 mt-8"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Questions About These Terms?</h3>
                <p className="text-gray-600 mb-6">
                  If you have any questions about these Terms of Service, please don't hesitate to contact our legal team.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="mailto:legal@travelplanner.com"
                    className="flex items-center gap-2 bg-brand-green hover:bg-opacity-90 text-white px-6 py-3 rounded-xl transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Contact Legal Team
                  </a>
                  
                  <button
                    onClick={() => window.location.href = '/help'}
                    className="flex items-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    View Help Center
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
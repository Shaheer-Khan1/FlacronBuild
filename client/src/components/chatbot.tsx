import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2,
  HelpCircle,
  DollarSign,
  FileText,
  Settings,
  Phone,
  Mail,
  Home,
  HardHat,
  ClipboardCheck,
  Shield,
  Sparkles,
  Target
} from 'lucide-react';
import { userRoleManager, type UserRole } from '@/lib/user-role';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  roleButtons?: { role: UserRole; label: string; icon: React.ComponentType<any>; description: string }[];
  tierRecommendation?: { tier: string; reason: string; features: string[] };
  contextualHelp?: { field: string; message: string };
}

interface ChatbotProps {
  onRoleSelect?: (role: UserRole) => void;
  onNavigateToPricing?: () => void;
  onNavigateToSupport?: () => void;
  triggerContextualHelp?: (field: string) => void;
  isFirstTimeUser?: boolean;
  currentFormField?: string;
}

export default function Chatbot({ 
  onRoleSelect, 
  onNavigateToPricing, 
  onNavigateToSupport, 
  triggerContextualHelp,
  isFirstTimeUser = false,
  currentFormField
}: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'role-selection' | 'needs-assessment' | 'tier-recommendation' | 'complete'>('welcome');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize messages based on onboarding state
  useEffect(() => {
    // Remove onboarding auto-open logic
    // Only set initial messages, do not open automatically
    setMessages([{
      id: '1',
      type: 'bot',
      content: "Hi! I'm your FlacronBuild assistant. I can help you with:\n\n🏠 Role selection and features\n💰 Pricing and plans\n📋 Step-by-step guidance\n❓ General questions\n\nWhat would you like to know?",
      timestamp: new Date(),
      suggestions: [
        "Help me choose a role",
        "Tell me about pricing",
        "How does the estimator work?",
        "What features do I get?"
      ]
    }]);
  }, []);

  // Contextual help for form fields
  useEffect(() => {
    if (currentFormField && isOpen) {
      showContextualHelp(currentFormField);
    }
  }, [currentFormField, isOpen]);

  const startOnboarding = () => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: "🎉 Welcome to FlacronBuild! I'm here to help you get started.\n\nLet's find the perfect role for you. Which best describes what you're looking to do?",
      timestamp: new Date(),
      roleButtons: [
        {
          role: 'homeowner',
          label: 'Homeowner',
          icon: Home,
          description: 'Get estimates for your own projects'
        },
        {
          role: 'contractor',
          label: 'Contractor',
          icon: HardHat,
          description: 'Create professional bids and estimates'
        },
        {
          role: 'inspector',
          label: 'Inspector',
          icon: ClipboardCheck,
          description: 'Conduct detailed inspections and assessments'
        },
        {
          role: 'insurance-adjuster',
          label: 'Insurance Adjuster',
          icon: Shield,
          description: 'Analyze claims and coverage'
        }
      ]
    }]);
    setOnboardingStep('role-selection');
  };

  const showContextualHelp = (field: string) => {
    const helpMessages: Record<string, string> = {
      'material-type': "🏗️ **Material Type Help**\n\n- **Asphalt Shingles**: Most common, cost-effective\n- **Metal Roofing**: Durable, energy-efficient\n- **Tile/Slate**: Premium, long-lasting\n- **Wood Shakes**: Natural, requires maintenance\n\nWhich material are you considering?",
      'roof-slope': "📐 **Roof Slope Help**\n\nSlope is measured as rise over run (e.g., 4:12 = 4 inches rise per 12 inches run)\n\n- **Low Slope (2:12 - 4:12)**: Requires special materials\n- **Standard Slope (4:12 - 9:12)**: Most common\n- **Steep Slope (9:12+)**: May require additional safety measures",
      'square-footage': "📏 **Square Footage Help**\n\nMeasure the total area of your roof:\n\n1. Measure length × width of each section\n2. Add all sections together\n3. Include overhangs and eaves\n\nNeed help calculating? I can guide you through it!",
      'damage-type': "🔍 **Damage Type Help**\n\nCommon roof damage types:\n\n- **Wind Damage**: Missing or lifted shingles\n- **Hail Damage**: Dents or punctures\n- **Water Damage**: Leaks, rot, mold\n- **Age/Wear**: General deterioration\n- **Storm Damage**: Multiple types from severe weather"
    };

    const helpMessage = helpMessages[field] || `Need help with ${field}? I'm here to assist!`;
    
    addMessage(helpMessage, 'bot', [
      "Show me examples",
      "How do I measure this?",
      "What's the typical cost?",
      "I need more details"
    ]);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addMessage = (content: string, type: 'user' | 'bot', suggestions?: string[], roleButtons?: any[], tierRecommendation?: any) => {
    console.log('Adding message:', { content, type });
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      suggestions,
      roleButtons,
      tierRecommendation
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleRoleSelection = (role: UserRole) => {
    // Add user's role selection
    addMessage(`I'm a ${role}`, 'user');
    
    // Move to needs assessment
    setOnboardingStep('needs-assessment');
    
    const needsQuestions = {
      'homeowner': [
        "What's your project timeline?",
        "What's your budget range?",
        "Do you need detailed breakdowns?"
      ],
      'contractor': [
        "How many estimates do you create monthly?",
        "Do you need bid-ready reports?",
        "Do you work with insurance claims?"
      ],
      'inspector': [
        "How many inspections do you perform monthly?",
        "Do you need certification tools?",
        "Do you work with insurance companies?"
      ],
      'insurance-adjuster': [
        "How many claims do you handle monthly?",
        "Do you need coverage analysis tools?",
        "Do you work with contractors?"
      ]
    };

    const questions = needsQuestions[role] || needsQuestions['homeowner'];
    
    setTimeout(() => {
      addMessage(
        `Great choice! Now let me understand your needs better.\n\nPlease answer a few quick questions:`,
        'bot',
        questions
      );
    }, 500);
  };

  const handleNeedsAssessment = (answer: string) => {
    addMessage(answer, 'user');
    
    // Simulate AI analysis and provide tier recommendation
    setTimeout(() => {
      const tierRecommendation = {
        tier: 'Premium',
        reason: 'Based on your needs for detailed reports and professional features',
        features: [
          'Unlimited estimates',
          'Detailed cost breakdowns',
          'Professional PDF reports',
          'Advanced analytics',
          'Priority support'
        ]
      };

      addMessage(
        `Perfect! Based on your needs, I recommend our **${tierRecommendation.tier} Plan**.\n\n**Why this plan?**\n${tierRecommendation.reason}\n\n**What you'll get:**`,
        'bot',
        [
          "Tell me more about this plan",
          "Show me pricing",
          "What about other plans?",
          "Start my free trial"
        ],
        undefined,
        tierRecommendation
      );
      
      setOnboardingStep('tier-recommendation');
    }, 1000);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Handle onboarding flow
    if (onboardingStep === 'needs-assessment') {
      handleNeedsAssessment(content);
      setInputValue('');
      return;
    }

    // Add user message
    addMessage(content, 'user');
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Add bot response
      addMessage(data.response, 'bot', data.suggestions);

      // Handle special actions
      if (data.action === 'select_role' && data.role && onRoleSelect) {
        onRoleSelect(data.role as UserRole);
      }
      if (data.action === 'navigate_pricing' && onNavigateToPricing) {
        onNavigateToPricing();
      }
      if (data.action === 'navigate_support' && onNavigateToSupport) {
        onNavigateToSupport();
      }

    } catch (error) {
      console.error('Chatbot error:', error);
      addMessage(
        "I'm sorry, I'm having trouble connecting right now. Please try again or contact our support team for assistance.",
        'bot',
        ["Try again", "Contact support"]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleRoleButtonClick = (role: UserRole) => {
    handleRoleSelection(role);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('flacronbuild-onboarding-seen', 'true');
    setHasSeenOnboarding(true);
    setOnboardingStep('complete');
    
    addMessage(
      "🎉 Perfect! You're all set up. I'm here whenever you need help with:\n\n• Creating estimates\n• Understanding features\n• Getting support\n• Role-specific guidance\n\nFeel free to ask me anything!",
      'bot',
      [
        "Show me how to create an estimate",
        "What features do I have access to?",
        "How do I download reports?",
        "I'm good for now"
      ]
    );
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[450px] bg-white dark:bg-neutral-900 rounded-lg shadow-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg) =>
                (msg.type === 'bot' && (msg.content.startsWith('action:') || msg.content.startsWith('role:'))) ? null : (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        msg.type === 'user'
                          ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {msg.type === 'bot' && <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                        <div className="whitespace-pre-wrap text-sm break-words overflow-hidden">{msg.content}</div>
                        {msg.type === 'user' && <User className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                      </div>
                      
                      {/* Role Selection Buttons */}
                      {msg.roleButtons && msg.type === 'bot' && (
                        <div className="mt-3 space-y-2 relative z-10">
                          {msg.roleButtons.map((roleBtn, index) => {
                            const IconComponent = roleBtn.icon;
                            return (
                              <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                className="w-full text-left justify-start h-auto p-2 text-xs border-neutral-200 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-700 focus:bg-neutral-50 dark:focus:bg-neutral-700 focus:border-neutral-300 dark:focus:border-neutral-500 active:bg-neutral-100 dark:active:bg-neutral-600 transition-colors relative z-10"
                                onClick={() => handleRoleButtonClick(roleBtn.role)}
                              >
                                <div className="flex items-start w-full">
                                  <IconComponent className="h-4 w-4 mr-2 text-neutral-600 dark:text-neutral-400 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs">{roleBtn.label}</div>
                                    <div className="text-neutral-500 dark:text-neutral-400 text-xs leading-relaxed break-words overflow-hidden">{roleBtn.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      )}

                      {/* Tier Recommendation */}
                      {msg.tierRecommendation && msg.type === 'bot' && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600">
                          <div className="flex items-center mb-2">
                            <Target className="h-4 w-4 text-neutral-600 dark:text-neutral-400 mr-2 flex-shrink-0" />
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">Recommended Plan</span>
                          </div>
                          <div className="text-xs">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">{msg.tierRecommendation.tier}</div>
                            <div className="text-neutral-700 dark:text-neutral-300 mb-2 break-words overflow-hidden">{msg.tierRecommendation.reason}</div>
                            <ul className="text-neutral-600 dark:text-neutral-400 space-y-1">
                              {msg.tierRecommendation.features.map((feature, index) => (
                                <li key={index} className="flex items-start">
                                  <div className="w-1 h-1 bg-neutral-400 dark:bg-neutral-500 rounded-full mr-2 mt-1.5 flex-shrink-0" />
                                  <span className="break-words overflow-hidden text-xs">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* Suggestions */}
                      {msg.suggestions && msg.type === 'bot' && (
                        <div className="mt-3 space-y-2">
                          {msg.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full text-left justify-start h-auto p-2 text-xs break-words overflow-hidden"
                              onClick={() => {
                                if (onboardingStep === 'tier-recommendation' && suggestion.includes('trial')) {
                                  completeOnboarding();
                                  if (onNavigateToPricing) onNavigateToPricing();
                                } else {
                                  handleSuggestionClick(suggestion);
                                }
                              }}
                            >
                              <span className="break-words overflow-hidden">{suggestion}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Typing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={onboardingStep === 'needs-assessment' ? "Tell me about your needs..." : "Type your message..."}
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
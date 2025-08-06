import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Home, HardHat, ClipboardCheck, Shield, LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { userRoleManager, type UserRole } from "@/lib/user-role";

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  roleButtons?: {
    role: UserRole;
    label: string;
    description: string;
    icon: LucideIcon;
  }[];
  suggestions?: string[];
  format?: 'plain' | 'list' | 'pricing';
}

interface ChatbotProps {
  onRoleSelect?: (role: UserRole) => void;
  onNavigateToPricing?: () => void;
  onNavigateToSupport?: () => void;
  triggerContextualHelp?: (field: string) => void;
  isFirstTimeUser?: boolean;
  currentFormField?: string;
}

const formatBotMessage = (content: string, format?: 'plain' | 'list' | 'pricing') => {
  // Remove all ** for bold
  let cleanContent = content.replace(/\*\*/g, '');
  // Remove leading emoji or symbol from role headings (e.g., '🕵️‍♂️ Inspector' -> 'Inspector')
  cleanContent = cleanContent.replace(/^\W+/, '');
  if (!format || format === 'plain') return cleanContent;
  if (format === 'list' || format === 'pricing') {
    return cleanContent.split('\n').map(line => {
      if (line.startsWith('• ')) {
        return line;
      }
      if (line.startsWith('- ')) {
        return '• ' + line.substring(2);
      }
      return line;
    }).join('\n');
  }
  return cleanContent;
};

const generateResponse = (text: string): { content: string; format?: 'plain' | 'list' | 'pricing'; suggestions?: string[] } => {
  const lowerText = text.toLowerCase();

  // Role selection response
  if (lowerText.includes('choose') && lowerText.includes('role')) {
    return {
      content: "I'll help you select the best role for your needs. We have different roles available:\n\n👨‍💼 **Inspector**\n• Detailed inspection tools\n• Professional report templates\n• Advanced measurements\n• Technical support\n\n🛡️ **Insurance Adjuster**\n• Claims-focused interface\n• Compliance tools\n• Documentation features\n• Priority support\n\nWhich role best describes you?",
      format: 'list'
    };
  }

  // Pricing information response
  if (lowerText.includes('pricing') || lowerText.includes('plans') || lowerText.includes('cost')) {
    return {
      content: "Here are our current pricing plans:\n\n🏠 **Homeowner Plan**\n• **Price**: $19.99/month\n• **Features**:\n- Basic estimator with simplified interface\n- Budget planning tools\n- Standard PDF reports\n- Email support\n\n🏗️ **Contractor Plan**\n• **Price**: $97.99/month or $999.99/year (Save $175/year)\n• **Features**:\n- Project management tools\n- Custom branded reports\n- Priority support\n- Unlimited estimates",
      format: 'pricing',
      suggestions: ["Help me choose a role", "How does the estimator work?"]
    };
  }

  // Estimator explanation response
  if (lowerText.includes('estimator') || lowerText.includes('how') && lowerText.includes('work')) {
    return {
      content: "Let me explain how our estimator works:\n\n1. **Project Details**\n- Enter basic property information\n- Specify roof type and condition\n- Add any special requirements\n\n2. **AI Analysis**\n- Our AI analyzes satellite imagery\n- Calculates accurate measurements\n- Considers local pricing factors\n\n3. **Cost Breakdown**\n- Detailed material costs\n- Labor estimates\n- Additional service costs\n\n4. **Professional Report**\n- Comprehensive PDF report\n- Shareable with clients\n- Includes all calculations\n\nWould you like to try it out?",
      format: 'list',
      suggestions: ["Help me choose a role", "Tell me about pricing"]
    };
  }

  // Default response with suggestions
  return {
    content: "I can help you with several things:\n\n• Choosing the right role for your needs\n• Understanding our pricing plans\n• Learning how the estimator works\n• Getting started with your first estimate\n\nWhat would you like to know more about?",
    format: 'list',
    suggestions: ["Help me choose a role", "Tell me about pricing", "How does the estimator work?"]
  };
};

export default function Chatbot({ 
  onRoleSelect, 
  onNavigateToPricing, 
  onNavigateToSupport, 
  triggerContextualHelp,
  isFirstTimeUser = false,
  currentFormField
}: ChatbotProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: 'welcome-message',
      type: 'bot',
      content: "Hi! I'm your FlacronBuild assistant. I can help you with:\n\n🏠 Role selection and features\n💰 Pricing and plans\n📋 Step-by-step guidance\n❓ General questions\n\nWhat would you like to know?",
      timestamp: new Date(),
      format: 'plain',
      suggestions: [
        "Help me choose a role",
        "Tell me about pricing",
        "How does the estimator work?"
      ]
    }
  ]);
  const [inputValue, setInputValue] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const handleRoleButtonClick = (role: UserRole) => {
    if (onRoleSelect) {
      onRoleSelect(role);
    }
  };

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Generate appropriate response
      const response = generateResponse(text);
      
      // Create bot message without any undefined properties
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: response.content,
        timestamp: new Date()
      };

      // Only add optional properties if they exist
      if (response.format) {
        botMessage.format = response.format;
      }
      if (response.suggestions) {
        botMessage.suggestions = response.suggestions;
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-[#ff8800] hover:bg-[#ff7700] transition-colors"
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl border border-neutral-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 bg-white">
            <h3 className="font-semibold text-lg">FlacronBuild Assistant</h3>
            <p className="text-sm text-neutral-500">Ask me anything about roofing estimates</p>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((msg, index) =>
                (msg.type === 'bot' && (msg.content.startsWith('action:') || msg.content.startsWith('role:'))) ? null : (
                  <div
                    key={index}
                    className={cn(
                      "flex w-full",
                      msg.type === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2",
                        msg.type === 'user'
                          ? "bg-[#ff8800] text-white"
                          : "bg-neutral-100 text-neutral-900"
                      )}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">
                        {msg.type === 'bot' ? formatBotMessage(msg.content, msg.format) : msg.content}
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Suggestion Buttons */}
              {messages.map((msg, index) => (
                msg.suggestions && msg.type === 'bot' && (
                  <div key={`suggestions-${index}`} className="mt-3 flex flex-wrap gap-2">
                    {msg.suggestions.map((suggestion, sugIndex) => (
                      <Button
                        key={sugIndex}
                        variant="outline"
                        className="bg-white text-sm py-2 px-4 rounded-full border border-neutral-200 hover:bg-neutral-50 hover:text-[#ff8800] hover:border-[#ff8800] transition-colors"
                        onClick={() => handleSendMessage(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                      </div>
                )
              ))}

              {/* Role Buttons */}
              {messages.map((msg, index) => (
                msg.roleButtons && msg.type === 'bot' && (
                  <div key={`buttons-${index}`} className="mt-3 space-y-2">
                    {msg.roleButtons.map((roleBtn, btnIndex) => {
                            const IconComponent = roleBtn.icon;
                            return (
                              <Button
                          key={btnIndex}
                                variant="outline"
                          className="w-full text-left justify-start h-auto p-3 hover:bg-neutral-50 hover:text-[#ff8800] hover:border-[#ff8800] transition-colors"
                          onClick={() => {
                            handleSendMessage(roleBtn.label);
                            handleRoleButtonClick(roleBtn.role);
                          }}
                              >
                                <div className="flex items-start w-full">
                            <IconComponent className="h-5 w-5 mr-3 text-[#ff8800]" />
                            <div>
                              <div className="font-medium">{roleBtn.label}</div>
                              <div className="text-sm text-neutral-500">{roleBtn.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                  </div>
                )
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 rounded-2xl px-4 py-2">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 text-sm border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#ff8800] focus:border-transparent"
              />
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full bg-[#ff8800] hover:bg-[#ff7700] transition-colors"
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 
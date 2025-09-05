import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Home, HardHat, ClipboardCheck, Shield, LucideIcon, Minimize2, Maximize2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { userRoleManager, type UserRole } from "@/lib/user-role";
import { useIsMobile } from "@/hooks/use-mobile";

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

// Responsive breakpoints
const BREAKPOINTS = {
  xs: 0,      // Extra small devices (phones)
  sm: 640,    // Small devices (large phones)
  md: 768,    // Medium devices (tablets)
  lg: 1024,   // Large devices (laptops)
  xl: 1280,   // Extra large devices (desktops)
  '2xl': 1536 // 2X large devices (large desktops)
} as const;

type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Custom hook for responsive design
const useResponsive = () => {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>('lg');
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setWindowSize({ width, height });

      if (width < BREAKPOINTS.sm) setScreenSize('xs');
      else if (width < BREAKPOINTS.md) setScreenSize('sm');
      else if (width < BREAKPOINTS.lg) setScreenSize('md');
      else if (width < BREAKPOINTS.xl) setScreenSize('lg');
      else if (width < BREAKPOINTS['2xl']) setScreenSize('xl');
      else setScreenSize('2xl');
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return {
    screenSize,
    windowSize,
    isMobile: screenSize === 'xs' || screenSize === 'sm',
    isTablet: screenSize === 'md',
    isDesktop: screenSize === 'lg' || screenSize === 'xl' || screenSize === '2xl',
    isSmallScreen: screenSize === 'xs',
    isLargeScreen: screenSize === 'xl' || screenSize === '2xl'
  };
};

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
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const responsive = useResponsive();
  const isMobile = useIsMobile(); // Keep for backward compatibility
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
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleRoleButtonClick = (role: UserRole) => {
    if (onRoleSelect) {
      onRoleSelect(role);
    }
  };

  // Responsive styling helpers
  const getChatbotDimensions = () => {
    if (isFullscreen) {
      return {
        width: '100vw',
        height: '100vh',
        position: 'fixed' as const,
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        borderRadius: '0',
        transform: 'none'
      };
    }

    const { screenSize, windowSize } = responsive;
    
    // Calculate 20% smaller than window size with minimum constraints
    const maxWidth = Math.max(280, Math.floor(windowSize.width * 0.8));
    const maxHeight = Math.max(400, Math.floor(windowSize.height * 0.8));
    
    switch (screenSize) {
      case 'xs': // Extra small phones
        return {
          width: 'calc(100vw - 2rem)',
          height: 'calc(100vh - 6rem)',
          position: 'fixed' as const,
          top: '1rem',
          left: '1rem',
          right: '1rem',
          bottom: '5rem',
          borderRadius: '1rem',
          transform: 'none'
        };
      case 'sm': // Small phones
        return {
          width: 'calc(100vw - 2rem)',
          height: 'calc(100vh - 8rem)',
          position: 'fixed' as const,
          top: '1rem',
          left: '1rem',
          right: '1rem',
          bottom: '7rem',
          borderRadius: '1rem',
          transform: 'none'
        };
      case 'md': // Tablets
        return {
          width: `min(400px, ${maxWidth}px)`,
          height: `min(500px, ${maxHeight}px)`,
          position: 'fixed' as const,
          top: '2rem',
          right: '1rem',
          bottom: 'auto',
          borderRadius: '1rem',
          transform: 'none'
        };
      case 'lg': // Laptops
        return {
          width: `${Math.min(350, maxWidth)}px`,
          height: `${Math.min(550, maxHeight)}px`,
          position: 'fixed' as const,
          top: '50%',
          right: '1.5rem',
          bottom: 'auto',
          transform: 'translateY(-50%)',
          borderRadius: '1.5rem'
        };
      case 'xl': // Desktops
        return {
          width: `${Math.min(380, maxWidth)}px`,
          height: `${Math.min(600, maxHeight)}px`,
          position: 'fixed' as const,
          top: '50%',
          right: '2rem',
          bottom: 'auto',
          transform: 'translateY(-50%)',
          borderRadius: '1.5rem'
        };
      case '2xl': // Large desktops
        return {
          width: `${Math.min(400, maxWidth)}px`,
          height: `${Math.min(650, maxHeight)}px`,
          position: 'fixed' as const,
          top: '50%',
          right: '2rem',
          bottom: 'auto',
          transform: 'translateY(-50%)',
          borderRadius: '1.5rem'
        };
      default:
        return {
          width: `${Math.min(350, maxWidth)}px`,
          height: `${Math.min(550, maxHeight)}px`,
          position: 'fixed' as const,
          top: '50%',
          right: '1.5rem',
          bottom: 'auto',
          transform: 'translateY(-50%)',
          borderRadius: '1.5rem'
        };
    }
  };

  const getButtonSize = () => {
    if (responsive.isSmallScreen) return { size: 'h-10 w-10', icon: 'h-4 w-4' };
    if (responsive.isTablet) return { size: 'h-12 w-12', icon: 'h-5 w-5' };
    if (responsive.isLargeScreen) return { size: 'h-16 w-16', icon: 'h-7 w-7' };
    return { size: 'h-14 w-14', icon: 'h-6 w-6' };
  };

  const getTextSize = () => {
    if (responsive.isSmallScreen) return { 
      header: 'text-sm', 
      subheader: 'text-xs', 
      message: 'text-xs', 
      input: 'text-xs',
      button: 'text-xs'
    };
    if (responsive.isTablet) return { 
      header: 'text-base', 
      subheader: 'text-sm', 
      message: 'text-sm', 
      input: 'text-sm',
      button: 'text-sm'
    };
    if (responsive.isLargeScreen) return { 
      header: 'text-xl', 
      subheader: 'text-base', 
      message: 'text-base', 
      input: 'text-base',
      button: 'text-base'
    };
    return { 
      header: 'text-lg', 
      subheader: 'text-sm', 
      message: 'text-sm', 
      input: 'text-sm',
      button: 'text-sm'
    };
  };

  const getSpacing = () => {
    if (responsive.isSmallScreen) return { 
      padding: 'p-2', 
      gap: 'space-y-2', 
      messagePadding: 'px-2.5 py-1',
      inputPadding: 'px-2.5 py-1.5'
    };
    if (responsive.isTablet) return { 
      padding: 'p-3', 
      gap: 'space-y-3', 
      messagePadding: 'px-3 py-1.5',
      inputPadding: 'px-3 py-2'
    };
    if (responsive.isLargeScreen) return { 
      padding: 'p-6', 
      gap: 'space-y-4', 
      messagePadding: 'px-5 py-2.5',
      inputPadding: 'px-5 py-3'
    };
    return { 
      padding: 'p-4', 
      gap: 'space-y-4', 
      messagePadding: 'px-4 py-2',
      inputPadding: 'px-4 py-2'
    };
  };

  // Simple scroll to bottom function
  const scrollToBottom = React.useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Scroll to bottom when loading completes
  React.useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, scrollToBottom]);

  // Scroll to bottom when chatbot opens
  React.useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, scrollToBottom]);

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

  const dimensions = getChatbotDimensions();
  const buttonSize = getButtonSize();
  const textSize = getTextSize();
  const spacing = getSpacing();

  return (
    <>
      {/* Backdrop for fullscreen mode */}
      {isOpen && isFullscreen && (responsive.isMobile || responsive.isTablet) && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setIsFullscreen(false);
            setIsOpen(false);
          }}
        />
      )}

      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "fixed z-50 rounded-full shadow-lg bg-[#ff8800] hover:bg-[#ff7700] transition-all duration-300",
          buttonSize.size,
          responsive.isSmallScreen ? "bottom-3 right-3" : 
          responsive.isTablet ? "bottom-4 right-4" : 
          "bottom-6 right-6",
          isOpen && "scale-95"
        )}
        size="icon"
      >
        {isOpen ? (
          <X className={buttonSize.icon} />
        ) : (
          <MessageCircle className={buttonSize.icon} />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "fixed z-50 bg-white shadow-2xl border border-neutral-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
            isFullscreen ? "animate-in fade-in-0 zoom-in-95" : "animate-in slide-in-from-bottom-2 fade-in-0"
          )}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            position: dimensions.position,
            top: dimensions.top,
            left: dimensions.left,
            right: dimensions.right,
            bottom: dimensions.bottom,
            borderRadius: dimensions.borderRadius,
            transform: dimensions.transform
          }}
        >
          {/* Header */}
          <div className={cn(
            "border-b border-neutral-200 bg-white flex items-center justify-between",
            spacing.padding
          )}>
            <div className="flex-1">
              <h3 className={cn(
                "font-semibold",
                textSize.header
              )}>FlacronBuild Assistant</h3>
              <p className={cn(
                "text-neutral-500",
                textSize.subheader
              )}>Ask me anything about roofing estimates</p>
            </div>
            
            {/* Header Controls */}
            <div className="flex items-center gap-2">
              {/* Fullscreen Toggle - Only show on mobile/tablet */}
              {(responsive.isMobile || responsive.isTablet) && (
                <Button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-500 hover:text-neutral-700"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              
              {/* Close Button */}
              <Button
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-500 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className={cn(
            "flex-1 overflow-y-auto",
            spacing.padding
          )} ref={scrollAreaRef}>
            <div className={spacing.gap}>
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
                        "rounded-2xl",
                        msg.type === 'user'
                          ? "bg-[#ff8800] text-white"
                          : "bg-neutral-100 text-neutral-900",
                        spacing.messagePadding,
                        responsive.isSmallScreen ? "max-w-[95%]" : 
                        responsive.isTablet ? "max-w-[85%]" : 
                        "max-w-[80%]"
                      )}
                    >
                      <p className={cn(
                        "whitespace-pre-line leading-relaxed",
                        textSize.message
                      )}>
                        {msg.type === 'bot' ? formatBotMessage(msg.content, msg.format) : msg.content}
                      </p>
                    </div>
                  </div>
                )
              )}

              {/* Suggestion Buttons - Only show for the last bot message with suggestions */}
              {(() => {
                // Find the last bot message with suggestions
                const lastBotMessageWithSuggestions = messages
                  .slice()
                  .reverse()
                  .find(msg => msg.type === 'bot' && msg.suggestions);
                
                if (lastBotMessageWithSuggestions && lastBotMessageWithSuggestions.suggestions) {
                  return (
                    <div className={cn(
                      "flex flex-wrap gap-1",
                      responsive.isSmallScreen ? "mt-1.5" : 
                      responsive.isTablet ? "mt-2" : 
                      "mt-3"
                    )}>
                      {lastBotMessageWithSuggestions.suggestions.map((suggestion, sugIndex) => (
                        <Button
                          key={sugIndex}
                          variant="outline"
                          className={cn(
                            "bg-white rounded-full border border-neutral-200 hover:bg-neutral-50 hover:text-[#ff8800] hover:border-[#ff8800] transition-colors",
                            textSize.button,
                            responsive.isSmallScreen ? "py-2 px-3 min-h-[44px]" : 
                            responsive.isTablet ? "py-2 px-4 min-h-[44px]" : 
                            "py-2 px-4"
                          )}
                          onClick={() => handleSendMessage(suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Role Buttons - Only show for the last bot message with role buttons */}
              {(() => {
                // Find the last bot message with role buttons
                const lastBotMessageWithRoleButtons = messages
                  .slice()
                  .reverse()
                  .find(msg => msg.type === 'bot' && msg.roleButtons);
                
                if (lastBotMessageWithRoleButtons && lastBotMessageWithRoleButtons.roleButtons) {
                  return (
                    <div className={cn(
                      "space-y-1",
                      responsive.isSmallScreen ? "mt-1.5" : 
                      responsive.isTablet ? "mt-2" : 
                      "mt-3"
                    )}>
                      {lastBotMessageWithRoleButtons.roleButtons.map((roleBtn, btnIndex) => {
                        const IconComponent = roleBtn.icon;
                        return (
                          <Button
                            key={btnIndex}
                            variant="outline"
                            className={cn(
                              "w-full text-left justify-start h-auto hover:bg-neutral-50 hover:text-[#ff8800] hover:border-[#ff8800] transition-colors",
                              responsive.isSmallScreen ? "p-1.5" : 
                              responsive.isTablet ? "p-2" : 
                              "p-3"
                            )}
                            onClick={() => {
                              handleSendMessage(roleBtn.label);
                              handleRoleButtonClick(roleBtn.role);
                            }}
                          >
                            <div className="flex items-start w-full">
                              <IconComponent className={cn(
                                "text-[#ff8800] flex-shrink-0",
                                responsive.isSmallScreen ? "h-3 w-3 mr-1.5 mt-0.5" : 
                                responsive.isTablet ? "h-4 w-4 mr-2 mt-0.5" : 
                                "h-5 w-5 mr-3"
                              )} />
                              <div>
                                <div className={cn(
                                  "font-medium",
                                  responsive.isSmallScreen ? "text-xs" : 
                                  responsive.isTablet ? "text-sm" : 
                                  "text-base"
                                )}>{roleBtn.label}</div>
                                <div className={cn(
                                  "text-neutral-500",
                                  responsive.isSmallScreen ? "text-xs leading-tight" : 
                                  responsive.isTablet ? "text-xs leading-relaxed" : 
                                  "text-sm"
                                )}>{roleBtn.description}</div>
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })()}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className={cn(
                    "bg-neutral-100 rounded-2xl",
                    spacing.messagePadding
                  )}>
                    <div className="flex space-x-1">
                      <div className={cn(
                        "bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.3s]",
                        responsive.isSmallScreen ? "w-1 h-1" : 
                        responsive.isTablet ? "w-1.5 h-1.5" : 
                        "w-2 h-2"
                      )}></div>
                      <div className={cn(
                        "bg-neutral-400 rounded-full animate-bounce [animation-delay:-0.15s]",
                        responsive.isSmallScreen ? "w-1 h-1" : 
                        responsive.isTablet ? "w-1.5 h-1.5" : 
                        "w-2 h-2"
                      )}></div>
                      <div className={cn(
                        "bg-neutral-400 rounded-full animate-bounce",
                        responsive.isSmallScreen ? "w-1 h-1" : 
                        responsive.isTablet ? "w-1.5 h-1.5" : 
                        "w-2 h-2"
                      )}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scroll trigger element */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className={cn(
            "border-t border-neutral-200 bg-white",
            spacing.padding
          )}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className={cn(
                "flex items-center",
                responsive.isSmallScreen ? "space-x-1" : 
                responsive.isTablet ? "space-x-1.5" : 
                "space-x-2"
              )}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={responsive.isSmallScreen ? "Type message..." : "Type your message..."}
                className={cn(
                  "flex-1 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#ff8800] focus:border-transparent",
                  textSize.input,
                  spacing.inputPadding,
                  // Better touch targets for mobile
                  responsive.isMobile && "min-h-[44px]",
                  // Prevent zoom on iOS
                  "text-base"
                )}
                // Prevent zoom on iOS Safari
                style={{ fontSize: responsive.isMobile ? '16px' : undefined }}
              />
              <Button
                type="submit"
                size="icon"
                className={cn(
                  "rounded-full bg-[#ff8800] hover:bg-[#ff7700] transition-colors flex-shrink-0",
                  responsive.isSmallScreen ? "h-8 w-8 min-h-[44px] min-w-[44px]" : 
                  responsive.isTablet ? "h-10 w-10 min-h-[44px] min-w-[44px]" : 
                  responsive.isLargeScreen ? "h-12 w-12" : 
                  "h-10 w-10"
                )}
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className={cn(
                  responsive.isSmallScreen ? "h-3 w-3" : 
                  responsive.isTablet ? "h-4 w-4" : 
                  responsive.isLargeScreen ? "h-6 w-6" : 
                  "h-5 w-5"
                )} />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 
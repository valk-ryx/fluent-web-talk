
import React, { useState, useEffect, useRef } from "react";
import { MessageBubble, TypingIndicator } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ApiKeyModal } from "./api-key-modal";
import { ModelSelector } from "./model-selector";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Trash2, Settings, X } from "lucide-react";
import {
  Message,
  models,
  hasApiKey,
  streamChatCompletion,
  clearApiKey
} from "@/services/openRouterService";

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [temperature, setTemperature] = useState(0.7);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for API key on component mount
  useEffect(() => {
    if (!hasApiKey()) {
      setIsApiKeyModalOpen(true);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message to the chat
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    
    setIsProcessing(true);
    
    try {
      // Start streaming AI response
      let fullResponse = "";
      
      await streamChatCompletion(
        {
          model: selectedModel,
          messages: [...messages, userMessage],
          temperature,
          stream: true,
        },
        (chunk) => {
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            
            // Check if there's already a response message
            if (lastMessage && lastMessage.role === "assistant") {
              // Update the existing response
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + chunk,
              };
            } else {
              // Add a new response message
              updatedMessages.push({
                role: "assistant",
                content: chunk,
              });
            }
            
            return updatedMessages;
          });
        },
        (fullResponseText) => {
          fullResponse = fullResponseText;
          setIsProcessing(false);
        },
        (error) => {
          console.error("Streaming error:", error);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${error.message}. Please try again or check your API key.`,
            },
          ]);
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
        },
      ]);
      setIsProcessing(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const handleChangeModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleChangeApiKey = () => {
    setIsApiKeyModalOpen(true);
  };

  const handleSignOut = () => {
    clearApiKey();
    setIsApiKeyModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <header className="p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-semibold">AI Chat</h1>
        
        <div className="flex items-center gap-2">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={handleChangeModel}
            disabled={isProcessing}
          />
          
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Settings size={20} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Settings</h3>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowSettings(false)}
                  >
                    <X size={16} />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Temperature: {temperature.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[temperature]}
                    min={0}
                    max={1}
                    step={0.1}
                    onValueChange={(values) => setTemperature(values[0])}
                  />
                  <span className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleChangeApiKey}
                  >
                    Change API Key
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <ThemeToggle />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            disabled={messages.length === 0}
            className="rounded-full"
          >
            <Trash2 size={20} />
          </Button>
        </div>
      </header>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-3 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold">Welcome to AI Chat</h2>
              <p className="text-muted-foreground">
                Start a conversation with an AI assistant powered by OpenRouter.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            {isProcessing && <TypingIndicator />}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input */}
      <div className="p-4 border-t">
        <ChatInput onSendMessage={handleSendMessage} isProcessing={isProcessing} />
      </div>
      
      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}


import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Message } from "@/services/openRouterService";

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast = false }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLast && bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLast, message.content]);

  return (
    <div
      ref={bubbleRef}
      className={cn(
        "flex w-full mb-4 animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-[hsl(var(--chat-user-bubble))] text-[hsl(var(--chat-user-text))]"
            : "bg-[hsl(var(--chat-ai-bubble))] text-[hsl(var(--chat-ai-text))]"
        )}
      >
        {isUser ? (
          <div className="prose dark:prose-invert max-w-none">{message.content}</div>
        ) : (
          <div className="prose dark:prose-invert max-w-none markdown-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start w-full mb-4">
      <div className="bg-[hsl(var(--chat-ai-bubble))] rounded-2xl px-5 py-3 shadow-sm max-w-[80%]">
        <div className="flex space-x-2">
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--chat-ai-text))] opacity-60 animate-pulse-soft" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--chat-ai-text))] opacity-60 animate-pulse-soft" style={{ animationDelay: "300ms" }}></div>
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--chat-ai-text))] opacity-60 animate-pulse-soft" style={{ animationDelay: "600ms" }}></div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Send, ArrowLeft, MoreVertical } from "lucide-react";

export default function DMPage() {
  const { conversation_id } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Track keyboard state for iOS
  useEffect(() => {
    const handleResize = () => {
      // Scroll to bottom when keyboard opens/closes
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!conversation_id) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages:${conversation_id}`)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "messages"
        },
        (payload) => {
          console.log("Received message:", payload.new);
          // Only add if it's for this conversation
          if (payload.new.conversation_id === conversation_id) {
            setMessages((prev) => {
              // Prevent duplicates
              if (prev.some(msg => msg.id === payload.new.id)) {
                return prev;
              }
              return [...prev, payload.new];
            });
            scrollToBottom();
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation_id]);

  async function fetchMessages() {
    setIsLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    setIsLoading(false);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function sendMessage() {
    if (!input.trim() || !userEmail || isSending) return;
    
    const messageContent = input.trim();
    setInput("");
    setIsSending(true);

    // Optimistic UI update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      conversation_id,
      sender: userEmail,
      content: messageContent,
      created_at: new Date().toISOString(),
      isOptimistic: true
    };
    
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            conversation_id,
            sender: userEmail,
            content: messageContent,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === tempMessage.id ? data : msg
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(msg => msg.id !== tempMessage.id));
      setInput(messageContent); // Restore input
    } finally {
      setIsSending(false);
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  // [#075e54]
  return (
    <div className="flex flex-col h-screen bg-[#efeae2] relative">
      {/* iOS-style Header */}
      <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3 flex-1">
          <button 
            onClick={() => window.history.back()}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold">
              {userEmail?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <h2 className="font-semibold text-base">Chat</h2>
              <p className="text-xs text-gray-200">online</p>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#075e54]"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender === userEmail;
            const showTimestamp = index === 0 || 
              new Date(msg.created_at).getTime() - 
              new Date(messages[index - 1].created_at).getTime() > 60000;

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-2">
                    <span className="bg-white/70 backdrop-blur-sm px-3 py-1 rounded-lg text-xs text-gray-600 shadow-sm">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex mb-1 animate-slideIn ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`relative px-3 py-2 rounded-lg max-w-[75%] shadow-sm ${
                      isOwn
                        ? "bg-[#dcf8c6] text-gray-900 rounded-br-none"
                        : "bg-white text-gray-900 rounded-bl-none"
                    } ${msg.isOptimistic ? 'opacity-70' : ''}`}
                  >
                    <p className="text-[15px] break-words leading-5">
                      {msg.content}
                    </p>
                    <span className="text-[10px] text-gray-500 float-right ml-2 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f0f0] px-2 py-2 flex items-end gap-2 sticky bottom-0 safe-area-bottom">
        <div className="flex-1 flex items-end bg-white rounded-3xl px-4 py-2 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            }}
            placeholder="Message"
            className="flex-1 bg-transparent outline-none resize-none max-h-[100px] text-[15px] text-gray-900 placeholder-gray-500"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
                if (inputRef.current) {
                  inputRef.current.style.height = 'auto';
                }
              }
            }}
            onFocus={scrollToBottom}
          />
        </div>
        <button
          onClick={() => {
            sendMessage();
            if (inputRef.current) {
              inputRef.current.style.height = 'auto';
            }
          }}
          disabled={!input.trim() || isSending}
          className={`p-3 rounded-full transition-all duration-200 ${
            input.trim() && !isSending
              ? "bg-[#075e54] text-white hover:bg-[#064e47] active:scale-95"
              : "bg-gray-300 text-gray-500"
          }`}
        >
          <Send size={20} className={isSending ? "animate-pulse" : ""} />
        </button>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        textarea::-webkit-scrollbar {
          width: 4px;
        }
        textarea::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
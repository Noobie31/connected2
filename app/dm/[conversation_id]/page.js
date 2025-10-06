"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Send } from "lucide-react";

export default function DMPage() {
  const { conversation_id } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (!conversation_id) return;

    fetchMessages();

    const channel = supabase
      .channel("realtime:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if (payload.new.conversation_id === conversation_id) {
            setMessages((prev) => [...prev, payload.new]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation_id]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });
    setMessages(data || []);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function sendMessage() {
    if (!input.trim() || !userEmail) return;
    await supabase.from("messages").insert([
      {
        conversation_id,
        sender: userEmail,
        content: input,
      },
    ]);
    setInput("");
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="p-3 border-b bg-gray-100 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-gray-800 text-center">
          Chat
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-2 ${
              msg.sender === userEmail ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`px-4 py-2 rounded-2xl max-w-[70%] ${
                msg.sender === userEmail
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-200 text-gray-900 rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={scrollRef}></div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t bg-white sticky bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-900 rounded-full px-4 py-2 outline-none"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

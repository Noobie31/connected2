// lib/chatHelpers.js
import { supabase } from "./supabase";

export async function getOrCreateConversation(userEmail, otherEmail) {
  // Try existing conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `and(participant1.eq.${userEmail},participant2.eq.${otherEmail}),and(participant1.eq.${otherEmail},participant2.eq.${userEmail})`
    )
    .single();

  if (existing) return existing.id;

  // Create new conversation
  const { data, error } = await supabase
    .from("conversations")
    .insert([{ participant1: userEmail, participant2: otherEmail }])
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

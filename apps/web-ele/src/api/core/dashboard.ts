import { supabase } from "#/lib/supabase";

export async function getDashboardStats() {
  const { count: userCount = 0 } = await supabase.from("profiles").select("*", {
    count: "exact",
    head: true,
  });

  const { count: chatCount = 0 } = await supabase.from("chats").select("*", {
    count: "exact",
    head: true,
  });

  const { count: promptCount = 0 } = await supabase.from("prompts").select("*", {
    count: "exact",
    head: true,
  });

  const { count: messageCount = 0 } = await supabase.from("messages").select("*", {
    count: "exact",
    head: true,
  });

  return {
    userCount,
    chatCount,
    promptCount,
    messageCount,
  };
}

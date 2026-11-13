import { supabase } from "../../infrastructure/supabase/client.js";
const { data, error } = await supabase.auth.getUser();
if (error || !data.user) window.location.replace("/auth.html");
else document.querySelector("#account-email").textContent = data.user.email || "Email не указан";
document.querySelector("#sign-out").addEventListener("click", async () => {
  const { error: signOutError } = await supabase.auth.signOut();
  if (!signOutError) window.location.replace("/");
});

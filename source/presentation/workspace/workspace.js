import { supabase } from "../../infrastructure/supabase/client.js";

const sections = {
  projects: { title: "Проекты", message: "Раздел пока в разработке." },
  ideas: { title: "Идеи", message: "Раздел пока в разработке." },
  team: { title: "Команда", message: "Раздел пока в разработке." },
  tools: { title: "Инструменты", message: "Раздел пока в разработке." },
  profile: { title: "Профиль", message: "Раздел пока в разработке." },
};

const { data, error } = await supabase.auth.getUser();
if (error || !data.user) {
  window.location.replace("/auth.html");
} else {
  const buttons = [...document.querySelectorAll("[data-section]")];
  const title = document.querySelector("#workspace-title");
  const placeholder = document.querySelector("#workspace-placeholder");

  function activate(section) {
    const view = sections[section];
    if (!view) return;
    title.textContent = view.title;
    placeholder.textContent = view.message;
    buttons.forEach((button) => {
      if (button.dataset.section === section) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => activate(button.dataset.section));
  });

  document.querySelector("#sign-out").addEventListener("click", async () => {
    const button = document.querySelector("#sign-out");
    button.disabled = true;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      button.disabled = false;
      button.textContent = "Не удалось выйти";
      return;
    }
    window.location.replace("/");
  });
}

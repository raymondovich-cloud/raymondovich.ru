const AUTH_MODULE = "/source/presentation/public/scripts/auth.js";
let authModuleFailed = false;

function renderAuthFailure() {
  if (!authModuleFailed || !location.hash.startsWith("#authorization")) return;
  const main = document.querySelector("#main");
  if (!main) return;

  const shell = main.querySelector("[data-auth-shell]");
  if (shell) {
    shell.innerHTML = `
      <div class="auth-heading">
        <p class="overline">RAYMONDOVICH / ACCOUNT</p>
        <h2>Не удалось загрузить авторизацию</h2>
        <p role="alert">Защищённая форма временно недоступна. Проверьте подключение к интернету и повторите попытку.</p>
      </div>
      <div class="auth-card">
        <button class="button primary" type="button" data-auth-retry>Повторить загрузку</button>
      </div>`;
    shell.querySelector("[data-auth-retry]")?.addEventListener("click", () => location.reload());
    return;
  }

  main.innerHTML = `
    <section class="section">
      <div class="auth-layout">
        <div class="auth-heading">
          <p class="overline">RAYMONDOVICH / ACCOUNT</p>
          <h2>Не удалось загрузить авторизацию</h2>
          <p role="alert">Защищённая форма временно недоступна. Проверьте подключение к интернету и повторите попытку.</p>
          <button class="button primary" type="button" data-auth-retry>Повторить загрузку</button>
        </div>
      </div>
    </section>`;
  main.querySelector("[data-auth-retry]")?.addEventListener("click", () => location.reload());
}

import(AUTH_MODULE).catch((error) => {
  authModuleFailed = true;
  console.error("Authorization module initialization failed:", error);
  renderAuthFailure();
  window.addEventListener("hashchange", renderAuthFailure);
  document.addEventListener("raymondovich:navigation", renderAuthFailure);
  const main = document.querySelector("#main");
  if (main) {
    const observer = new MutationObserver(renderAuthFailure);
    observer.observe(main, { childList: true, subtree: true });
  }
});

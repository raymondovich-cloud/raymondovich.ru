// version 2.0
import { getSession, getRole, logout } from "../../application/auth/authentication.js";

const logoutButton = document.querySelector("#logout-button");
const status = document.querySelector("#control-status");

function showError(message) {
  status.textContent = message;
  status.dataset.state = "error";
}

async function init() {
  try {
    const session = await getSession();

    if (!session) {
      window.location.replace("./auth.html");
      return;
    }

    if (getRole(session) !== "admin") {
      window.location.replace("./auth.html");
    }
  } catch (error) {
    showError(error.message || "Не удалось проверить доступ.");
  }
}

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    await logout();
    window.location.replace("./auth.html");
  } catch (error) {
    logoutButton.disabled = false;
    showError(error.message || "Не удалось завершить сеанс.");
  }
});

init();

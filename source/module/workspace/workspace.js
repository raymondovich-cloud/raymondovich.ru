/* Version: 1.4.0 */
/* Updated: 2026-11-16 */
import { renderWorkspaceView } from "../../design-sistem/workspace-view.js";

let profileScrollFrame = 0;

function syncProfileIdentityCard() {
 const card = document.querySelector(".profile-identity-card");
 if (!card) return;
 const isCollapsed = card.classList.contains("is-collapsed");
 const shouldCollapse = isCollapsed ? window.scrollY > 20 : window.scrollY > 64;
 card.classList.toggle("is-collapsed", shouldCollapse);
}

function installProfileScrollBehavior() {
 if (window.__raymondovichProfileScrollInstalled) return;
 window.__raymondovichProfileScrollInstalled = true;
 window.addEventListener("scroll", () => {
  if (profileScrollFrame) return;
  profileScrollFrame = window.requestAnimationFrame(() => {
   profileScrollFrame = 0;
   syncProfileIdentityCard();
  });
 }, { passive: true });
}

export function mountWorkspace(container, user, section = "projects", profileData = null) {
 renderWorkspaceView(container, user, section, profileData);
 installProfileScrollBehavior();
 syncProfileIdentityCard();
}

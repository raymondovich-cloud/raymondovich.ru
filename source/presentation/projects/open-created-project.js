// version 1.0
const projectId = new URLSearchParams(window.location.search).get("project");

if (projectId) {
  const openCreatedProject = () => {
    const button = document.querySelector('[data-project-id="' + CSS.escape(projectId) + '"]');
    if (button) {
      button.click();
      return true;
    }
    return false;
  };

  if (!openCreatedProject()) {
    const observer = new MutationObserver(() => {
      if (openCreatedProject()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }
}

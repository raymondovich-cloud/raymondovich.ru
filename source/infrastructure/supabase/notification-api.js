/* Version: 1.1.0 */
/* Updated: 2026-11-24 */
export function createNotificationApi({ getSession, request }) {
  async function authenticatedRequest(name, body = {}) {
    const session = await getSession();
    if (!session) throw new Error("Сессия пользователя не найдена. Войдите в аккаунт повторно.");
    return request(`/rest/v1/rpc/${name}`, { method: "POST", accessToken: session.access_token, body });
  }
  return {
    async list() { return authenticatedRequest("notifications_list"); },
    async markRead(id) { return authenticatedRequest("notification_mark_read", { p_notification_id: id }); },
    async telegramLinkStatus() { return authenticatedRequest("telegram_link_status"); },
    async telegramLinkStart() { return authenticatedRequest("telegram_link_start"); },
    async telegramLinkUnlink() { return authenticatedRequest("telegram_link_unlink"); },
  };
}

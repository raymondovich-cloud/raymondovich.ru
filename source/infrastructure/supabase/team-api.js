/* Version: 1.5.0 */
/* Updated: 2026-11-24 */

/**
 * Supabase RPC adapter for the independent Team domain.
 * All authorization is enforced by the database RPC boundary.
 */
export function createTeamApi({ getSession, request }) {
  async function authenticatedRequest(name, body = {}) {
    const session = await getSession();
    if (!session) {
      throw new Error("Сессия пользователя не найдена. Войдите в аккаунт повторно.");
    }
    return request(`/rest/v1/rpc/${name}`, {
      method: "POST",
      accessToken: session.access_token,
      body,
    });
  }

  return {
    async createTeam({ name, description }) {
      return authenticatedRequest("team_create", {
        p_name: name,
        p_description: description || null,
      });
    },
    async archiveTeam(teamId) { return authenticatedRequest("team_archive", { p_team_id: teamId }); },
    async restoreTeam(teamId) { return authenticatedRequest("team_restore", { p_team_id: teamId }); },
    async permanentlyDeleteTeam({ teamId, password }) {
      const session = await getSession();
      if (!session) throw new Error("Сессия пользователя не найдена. Войдите в аккаунт повторно.");
      const user = await request("/auth/v1/user", { accessToken: session.access_token });
      if (!user?.email) throw new Error("Не удалось определить электронную почту аккаунта.");
      const verifiedSession = await request("/auth/v1/token?grant_type=password", {
        method: "POST", body: { email: user.email, password: String(password || "") },
      });
      if (!verifiedSession?.access_token) throw new Error("Не удалось подтвердить пароль аккаунта.");
      return request("/rest/v1/rpc/team_permanent_delete", {
        method: "POST", accessToken: verifiedSession.access_token, body: { p_team_id: teamId },
      });
    },

    async getArchivedTeams() { return authenticatedRequest("team_archived_list"); },
    async getTeams() {
      return authenticatedRequest("team_list");
    },
    async getTeam(teamId) {
      return authenticatedRequest("team_get", { p_team_id: teamId });
    },
    async getTeamMembers(teamId) { return authenticatedRequest("team_members_list", { p_team_id: teamId }); },
    async inviteToTeam({ teamId, username, role, message }) { return authenticatedRequest("team_invite", { p_team_id: teamId, p_username: username, p_role: role, p_message: message || null }); },
    async getTeamInvitations(teamId) { return authenticatedRequest("team_invitations_list", { p_team_id: teamId }); },
    async cancelTeamInvitation(id) { return authenticatedRequest("team_invitation_cancel", { p_invitation_id: id }); },
    async acceptTeamInvitation(id) { return authenticatedRequest("team_invitation_accept", { p_invitation_id: id }); },
    async declineTeamInvitation(id) { return authenticatedRequest("team_invitation_decline", { p_invitation_id: id }); },
  };
}

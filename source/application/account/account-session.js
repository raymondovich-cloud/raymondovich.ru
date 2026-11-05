// version 2.0
export function createAccountSessionService({ authGateway }) {
  return {
    async signOutAccount() {
      const { error } = await authGateway.signOut();
      if (error) throw new Error(error.message || "Не удалось завершить сеанс.");
    },
  };
}

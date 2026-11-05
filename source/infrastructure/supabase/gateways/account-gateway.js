import { supabase } from "../client.js";

export const accountGateway = {
  getUser: () => supabase.auth.getUser(),
  updateUser: (attributes) => supabase.auth.updateUser(attributes),
};

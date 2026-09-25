import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  type UserResponse,
} from "../services/authService";

import { AuthContext } from "./authContext";


type AuthProviderProps = {
  children: ReactNode;
};


export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [token, setToken] = useState<
    string | null
  >(() =>
    localStorage.getItem(
      "aura_access_token"
    )
  );

  const [user, setUser] =
    useState<UserResponse | null>(null);

  const [loading, setLoading] =
    useState(true);


  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const currentUser =
          await getCurrentUser(token);

        setUser(currentUser);

      } catch {
        localStorage.removeItem(
          "aura_access_token"
        );

        setToken(null);
        setUser(null);

      } finally {
        setLoading(false);
      }
    }

    loadUser();

  }, [token]);


  function login(newToken: string) {
    localStorage.setItem(
      "aura_access_token",
      newToken
    );

    setToken(newToken);
  }


  function logout() {
    localStorage.removeItem(
      "aura_access_token"
    );

    setToken(null);
    setUser(null);
  }


  const isAuthenticated =
    Boolean(token && user);


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
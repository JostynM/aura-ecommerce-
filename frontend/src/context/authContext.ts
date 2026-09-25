import { createContext } from "react";

import type { UserResponse } from "../services/authService";


export type AuthContextType = {
  user: UserResponse | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;

  login: (token: string) => void;
  logout: () => void;
};


export const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );
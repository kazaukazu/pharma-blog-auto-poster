import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState, User } from '../types';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('auth-token');
      const userString = localStorage.getItem('auth-user');

      if (token && userString) {
        try {
          const user = JSON.parse(userString);
          setState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Verify token is still valid
          await apiService.getProfile();
        } catch (error) {
          // Token is invalid, clear auth state
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-user');
          setState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      
      const response = await apiService.login(email, password);
      const { user, token } = response.data;

      localStorage.setItem('auth-token', token);
      localStorage.setItem('auth-user', JSON.stringify(user));

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success('ログインしました');
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      const message = error.response?.data?.error || 'ログインに失敗しました';
      toast.error(message);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      
      const response = await apiService.register(email, password, name);
      const { user, token } = response.data;

      localStorage.setItem('auth-token', token);
      localStorage.setItem('auth-user', JSON.stringify(user));

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      toast.success('アカウントを作成しました');
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      const message = error.response?.data?.error || 'アカウント作成に失敗しました';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    toast.success('ログアウトしました');
  };

  const updateUser = (user: User) => {
    localStorage.setItem('auth-user', JSON.stringify(user));
    setState((prev) => ({ ...prev, user }));
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
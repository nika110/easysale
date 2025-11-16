/**
 * Authentication Context
 * Manages user session and authentication state
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, userAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, fullName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, fullName: string) => {
    try {
      // First, try to find existing user by email
      const existingUsers = await userAPI.list();
      let userData = existingUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      // If user doesn't exist, create new user
      if (!userData) {
        console.log('Creating new user:', { email, full_name: fullName });
        userData = await userAPI.create(email, fullName);
        console.log('User created successfully:', userData);
      } else {
        console.log('Existing user found:', userData);
      }

      // Save user to state and localStorage
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to login. Please check your connection and try again.');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const refreshUser = async () => {
    // Refresh user data from backend
    if (user) {
      try {
        const userData = await userAPI.get(user.id);
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to refresh user:', error);
        // If refresh fails, keep existing user data
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

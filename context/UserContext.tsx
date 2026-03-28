import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { drizzle } from 'drizzle-orm/expo-sqlite'; 
import { useSQLiteContext } from 'expo-sqlite';
import * as schema from '@/db/schema'; 
import { ActivityIndicator } from 'react-native'; 

type User = {
  id: number;
  name: string;
  username: string;
  coins: number;
  activeCatColorId: number;
  activeCatHatId: number;
};

type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  updateUser: (newFields: Partial<User>) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const db = useSQLiteContext();
  if (!db) {
    return <ActivityIndicator size="large" />;
  }

  useEffect(() => {
    const loadUserFromStorage = async () => {
      const storedId = await AsyncStorage.getItem('userId');
      if (storedId) {
        // Fetch user from the database after getting the ID
        const userFromDb = await drizzle(db).select().from(schema.users).where(eq(schema.users.id, Number(storedId))).get();
        if (userFromDb) {
          setUser(userFromDb);
        }
      }
    };
    loadUserFromStorage();
  }, [db]); // Ensure the db context is available

  // Update user context with new fields
  const updateUser = (newFields: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...newFields }));
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
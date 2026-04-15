import { useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTIONS, ID } from '../lib/appwrite';

// Derives 1–2 letter initials from a display name or email.
const getInitials = (name, email) => {
  if (name && name.trim()) {
    return name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.$id);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId);
      setProfile({
        id: doc.$id,
        name: doc.name,
        email: doc.email,
        avatar_initials: doc.avatar_initials,
        role: doc.role,
        color: doc.color,
      });
    } catch (error) {
      if (error.code === 404) {
        await ensureProfile();
      } else {
        console.error('Error fetching profile:', error);
      }
    }
  };

  const ensureProfile = async () => {
    try {
      const currentUser = await account.get();

      // Try fetching once more (handles race conditions on first OAuth login)
      try {
        const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, currentUser.$id);
        setProfile({
          id: doc.$id,
          name: doc.name,
          email: doc.email,
          avatar_initials: doc.avatar_initials,
          role: doc.role,
          color: doc.color,
        });
        return;
      } catch (e) {
        if (e.code !== 404) throw e;
      }

      // Create profile — safe for OAuth (name may be empty) and email signup
      const initials = getInitials(currentUser.name, currentUser.email);
      const newProfile = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        currentUser.$id,
        {
          name: currentUser.name || currentUser.email.split('@')[0],
          email: currentUser.email,
          avatar_initials: initials,
          role: 'Member',
          color: '#3b82f6',
        }
      );
      setProfile({
        id: newProfile.$id,
        name: newProfile.name,
        email: newProfile.email,
        avatar_initials: newProfile.avatar_initials,
        role: newProfile.role,
        color: newProfile.color,
      });
    } catch (error) {
      console.error('Error ensuring profile:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      account.createOAuth2Session('google', window.location.origin, window.location.origin);
    } catch (err) {
      console.error('Login error:', err);
      alert(err.message);
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      await checkUser();
      return { data: session, error: null };
    } catch (err) {
      console.error('Sign in error:', err);
      alert(err.message);
      return { data: null, error: err };
    }
  };

  const signUpWithEmail = async (email, password, fullName) => {
    try {
      const newUser = await account.create(ID.unique(), email, password, fullName);
      await account.createEmailPasswordSession(email, password);

      const initials = getInitials(fullName, email);
      await databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, newUser.$id, {
        name: fullName || email.split('@')[0],
        email,
        avatar_initials: initials,
        role: 'member',
      });

      await checkUser();
      return { data: newUser, error: null };
    } catch (err) {
      console.error('Sign up error:', err);
      alert(err.message);
      return { data: null, error: err };
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) return;
      
      const updatedData = { ...updates };
      if (updates.name) {
        updatedData.avatar_initials = getInitials(updates.name, user.email);
      }
      
      const doc = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PROFILES,
        user.$id,
        updatedData
      );
      
      setProfile({
        id: doc.$id,
        name: doc.name,
        email: doc.email,
        avatar_initials: doc.avatar_initials,
        role: doc.role,
        color: doc.color,
      });
      return { data: doc, error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { data: null, error };
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, updateProfile };
};

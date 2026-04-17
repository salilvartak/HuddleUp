import { useState, useEffect } from 'react';
import { account, databases, DATABASE_ID, COLLECTIONS, ID } from '../lib/appwrite';
import { Permission, Role } from 'appwrite';

export const getInitials = (name, email) => {
  if (name && name.trim()) {
    return name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
};

// Ensures a profile document exists in Appwrite for the given user.
// Tries multiple attribute/permission combinations. Safe to call even if profile exists.
export const createProfileIfNeeded = async (userId, name, email) => {
  const initials = getInitials(name, email);
  const permissions = [
    Permission.read(Role.any()),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];

  // Check if already exists
  try {
    await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId);
    return true;
  } catch (e) {
    if (e.code !== 404) return false; // Not a missing-doc error, skip creation
  }

  // Try all combinations: with/without avatar_initials, with/without explicit permissions
  // email is a required field in the PROFILES collection
  const createAttempts = [
    () => databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, email, avatar_initials: initials }, permissions),
    () => databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, email }, permissions),
    () => databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, email, avatar_initials: initials }),
    () => databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, email }),
  ];

  for (const attempt of createAttempts) {
    try {
      await attempt();
      return true;
    } catch (e) {
      if (e.code === 409) {
        // Document exists but wasn't readable (wrong permissions) — try to update it
        const updateAttempts = [
          () => databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, email, avatar_initials: initials }, permissions),
          () => databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, email }, permissions),
          () => databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name, avatar_initials: initials }),
          () => databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, userId, { name }),
        ];
        for (const updateAttempt of updateAttempts) {
          try {
            await updateAttempt();
            return true;
          } catch (ue) {
            console.warn('Profile update attempt failed:', ue.code, ue.message);
          }
        }
        return false;
      }
      console.warn('createProfileIfNeeded attempt failed:', e.code, e.message);
    }
  }
  return false;
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
      const name = doc.name || '';
      setProfile({
        id: doc.$id,
        name,
        avatar_initials: doc.avatar_initials || getInitials(name, ''),
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
      const name = currentUser.name || currentUser.email.split('@')[0];
      const initials = getInitials(name, currentUser.email);

      // Set in-memory profile immediately so UI works regardless of DB result
      setProfile({ id: currentUser.$id, name, avatar_initials: initials });

      // Best-effort: create the profile document so other users can see this user's info
      await createProfileIfNeeded(currentUser.$id, name, currentUser.email);
    } catch (error) {
      console.error('Error ensuring profile:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      // Use full href so ?inviteId=xxx is preserved after the OAuth redirect
      account.createOAuth2Session('google', window.location.href, window.location.origin);
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
      const name = fullName || email.split('@')[0];
      await createProfileIfNeeded(newUser.$id, name, email);
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
      if (!user) return { data: null, error: null };
      if (!updates.name) return { data: null, error: null };

      const name = updates.name;
      const initials = getInitials(name, user.email);

      let doc;
      try {
        doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, user.$id, { name, avatar_initials: initials });
      } catch (e) {
        if (e.code === 400) {
          // avatar_initials not in schema — retry without it
          try {
            doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, user.$id, { name });
          } catch (e2) {
            if (e2.code === 404) {
              await createProfileIfNeeded(user.$id, name, user.email);
              doc = { name, avatar_initials: initials };
            } else {
              throw e2;
            }
          }
        } else if (e.code === 404) {
          // Profile doesn't exist yet — create it
          await createProfileIfNeeded(user.$id, name, user.email);
          doc = { name, avatar_initials: initials };
        } else {
          throw e;
        }
      }

      setProfile(prev => ({
        ...prev,
        name: doc.name || name,
        avatar_initials: doc.avatar_initials || initials,
      }));
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

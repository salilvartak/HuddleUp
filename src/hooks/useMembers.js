import { useState, useEffect, useCallback } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, account, ID, teams } from '../lib/appwrite';
import { Query } from 'appwrite';

export const useMembers = (workspaceId) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WORKSPACE_MEMBERS,
        [Query.equal('workspace_id', workspaceId)]
      );

      const userIds = response.documents.map(doc => doc.user_id);
      
      // Fetch all matching profiles in a single bulk query
      const profilesResponse = userIds.length > 0 
        ? await databases.listDocuments(
            DATABASE_ID, 
            COLLECTIONS.PROFILES, 
            [Query.equal('$id', userIds)]
          )
        : { documents: [] };

      const profileMap = profilesResponse.documents.reduce((acc, p) => ({ ...acc, [p.$id]: p }), {});

      const membersData = response.documents.map((doc) => {
        const profileDoc = profileMap[doc.user_id];
        return {
          ...doc,
          id: doc.$id,
          profile: profileDoc || {
            name: doc.user_id.slice(0, 8),
            email: '',
            avatar_initials: doc.user_id.slice(0, 2).toUpperCase(),
            color: '#3b82f6'
          }
        };
      });

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const invite = async (email, role) => {
    try {
      const user = await account.get();
      
      // Create a record in the database for tracking
      const data = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WORKSPACE_INVITES,
        ID.unique(),
        {
          workspace_id: workspaceId,
          email: email.toLowerCase(),
          role,
          invited_by: user.$id,
          accepted: false,
          created_at: new Date().toISOString()
        }
      );

      // Generate the invitation link
      const inviteLink = `${window.location.origin}/?inviteId=${data.$id}`;

      return { data: { ...data, id: data.$id, inviteLink }, error: null };
    } catch (error) {
      console.error('Error inviting member:', error);
      return { data: null, error };
    }
  };

  return { members, loading, invite, refresh: fetchMembers };
};

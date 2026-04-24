import { Client, Account, Databases, Storage, Teams, ID } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const teams = new Teams(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

// Collection IDs - Suggesting standard names
export const COLLECTIONS = {
    PROFILES: 'profiles',
    WORKSPACES: 'workspaces',
    WORKSPACE_MEMBERS: 'workspace_members',
    WORKSPACE_INVITES: 'workspace_invites',
    PROJECTS: 'projects',
    GROUPS: 'groups',
    TASKS: 'tasks',
    COMMENTS: 'comments',
    ACTIVITY: 'activity',
    ATTACHMENTS: 'attachments',
    NOTIFICATIONS: 'notifications',
};

export { client, ID };

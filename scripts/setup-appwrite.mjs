import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;

const COLLECTIONS = [
    {
        id: 'profiles',
        name: 'Profiles',
        attributes: [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'avatar_initials', type: 'string', size: 10, required: true },
            { key: 'role', type: 'string', size: 50, required: false, default: 'member' }
        ]
    },
    {
        id: 'workspaces',
        name: 'Workspaces',
        attributes: [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'slug', type: 'string', size: 255, required: true },
            { key: 'created_by', type: 'string', size: 255, required: true }
        ]
    },
    {
        id: 'workspace_members',
        name: 'Workspace Members',
        attributes: [
            { key: 'workspace_id', type: 'string', size: 255, required: true },
            { key: 'user_id', type: 'string', size: 255, required: true },
            { key: 'role', type: 'string', size: 50, required: true }
        ]
    },
    {
        id: 'projects',
        name: 'Projects',
        attributes: [
            { key: 'workspace_id', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'emoji', type: 'string', size: 10, required: false, default: '📋' },
            { key: 'position', type: 'integer', required: false, default: 0 },
            { key: 'created_by', type: 'string', size: 255, required: true }
        ]
    },
    {
        id: 'groups',
        name: 'Groups',
        attributes: [
            { key: 'project_id', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'position', type: 'integer', required: false, default: 0 }
        ]
    },
    {
        id: 'tasks',
        name: 'Tasks',
        attributes: [
            { key: 'group_id', type: 'string', size: 255, required: true },
            { key: 'title', type: 'string', size: 255, required: true },
            { key: 'description', type: 'string', size: 5000, required: false },
            { key: 'status', type: 'string', size: 50, required: false, default: 'todo' },
            { key: 'priority', type: 'string', size: 50, required: false, default: 'medium' },
            { key: 'assignee_id', type: 'string', size: 255, required: false },
            { key: 'parent_id', type: 'string', size: 255, required: false },
            { key: 'due_date', type: 'string', size: 50, required: false },
            { key: 'position', type: 'integer', required: false, default: 0 },
            { key: 'created_by', type: 'string', size: 255, required: true }
        ]
    },
    {
        id: 'comments',
        name: 'Comments',
        attributes: [
            { key: 'task_id', type: 'string', size: 255, required: true },
            { key: 'author_id', type: 'string', size: 255, required: true },
            { key: 'text', type: 'string', size: 2000, required: true },
            { key: 'created_at', type: 'string', size: 50, required: true }
        ]
    },
    {
        id: 'activity',
        name: 'Activity',
        attributes: [
            { key: 'task_id', type: 'string', size: 255, required: true },
            { key: 'actor_id', type: 'string', size: 255, required: true },
            { key: 'actor_name', type: 'string', size: 255, required: false },
            { key: 'action', type: 'string', size: 255, required: true },
            { key: 'created_at', type: 'string', size: 50, required: true }
        ]
    },
    {
        id: 'workspace_invites',
        name: 'Workspace Invites',
        attributes: [
            { key: 'workspace_id', type: 'string', size: 255, required: true },
            { key: 'email', type: 'string', size: 255, required: true },
            { key: 'role', type: 'string', size: 50, required: true },
            { key: 'invited_by', type: 'string', size: 255, required: true },
            { key: 'accepted', type: 'boolean', required: false, default: false },
            { key: 'created_at', type: 'string', size: 50, required: true }
        ]
    },
    {
        id: 'attachments',
        name: 'Attachments',
        attributes: [
            { key: 'task_id', type: 'string', size: 255, required: true },
            { key: 'file_id', type: 'string', size: 255, required: true },
            { key: 'file_name', type: 'string', size: 255, required: true },
            { key: 'file_type', type: 'string', size: 100, required: true },
            { key: 'file_size', type: 'integer', required: true },
            { key: 'uploaded_by', type: 'string', size: 255, required: true },
            { key: 'created_at', type: 'string', size: 50, required: true }
        ]
    }
];

async function setup() {
    try {
        console.log('--- Starting Appwrite Setup ---');
        
        // 1. Create Database if it doesn't exist
        try {
            await databases.get(DATABASE_ID);
            console.log(`Database "${DATABASE_ID}" already exists.`);
        } catch (e) {
            console.log(`Creating database "${DATABASE_ID}"...`);
            await databases.create(DATABASE_ID, DATABASE_ID);
        }

        // 2. Create Collections and Attributes
        const defaultPermissions = [
            Permission.read(Role.any()),
            Permission.create(Role.any()),
            Permission.update(Role.any()),
            Permission.delete(Role.any()),
        ];

        for (const col of COLLECTIONS) {
            try {
                await databases.getCollection(DATABASE_ID, col.id);
                console.log(`Collection "${col.id}" already exists. Updating permissions...`);
                await databases.updateCollection(DATABASE_ID, col.id, col.name, defaultPermissions);
            } catch (e) {
                console.log(`Creating collection "${col.id}"...`);
                await databases.createCollection(DATABASE_ID, col.id, col.name, defaultPermissions);
            }

            // Add attributes (even if collection existed, in case it was a partial setup)
            for (const attr of col.attributes) {
                try {
                    console.log(`  Checking attribute "${attr.key}" in "${col.id}"...`);
                    if (attr.type === 'string') {
                        await databases.createStringAttribute(DATABASE_ID, col.id, attr.key, attr.size, attr.required, attr.default);
                    } else if (attr.type === 'integer') {
                        await databases.createIntegerAttribute(DATABASE_ID, col.id, attr.key, attr.required, 0, 1000000, attr.default);
                    } else if (attr.type === 'boolean') {
                        await databases.createBooleanAttribute(DATABASE_ID, col.id, attr.key, attr.required, attr.default);
                    }
                    console.log(`    Attribute "${attr.key}" created.`);
                } catch (attrError) {
                    if (attrError.code === 409) {
                        console.log(`    Attribute "${attr.key}" already exists.`);
                    } else {
                        console.error(`    Failed to create attribute "${attr.key}":`, attrError.message);
                    }
                }
            }
            
            // Wait for attributes to process
            console.log(`  Waiting for attributes to process...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n--- Setup Complete! ---');
        console.log('You can now run your app.');

    } catch (error) {
        console.error('Setup failed:', error);
    }
}

if (!process.env.APPWRITE_API_KEY) {
    console.error('ERROR: APPWRITE_API_KEY is missing in your .env file.');
    console.log('Please create an API key in the Appwrite Console and add it to .env');
    process.exit(1);
}

setup();

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/conversations.sqlite');

export class MemoryStore {
    constructor() {
        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        this.db.pragma('journal_mode = WAL');
        
        // 1. Lưu thông tin hồ sơ từng người dùng theo từng bot profile
        this.db.exec(
            'CREATE TABLE IF NOT EXISTS user_profiles (' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'profile_id TEXT NOT NULL, ' +
            'user_id TEXT NOT NULL, ' +
            'user_name TEXT, ' +
            'platform TEXT NOT NULL, ' +
            'facts_json TEXT DEFAULT "{}", ' +
            'rapport_level INTEGER DEFAULT 1, ' +
            'last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
            'UNIQUE(profile_id, user_id, platform)' +
            '); ' +
            'CREATE TABLE IF NOT EXISTS message_history (' +
            'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
            'profile_id TEXT NOT NULL, ' +
            'user_id TEXT NOT NULL, ' +
            'platform TEXT NOT NULL, ' +
            'sender TEXT NOT NULL, ' +
            'message_text TEXT NOT NULL, ' +
            'emotion_state TEXT, ' +
            'created_at DATETIME DEFAULT CURRENT_TIMESTAMP' +
            ');'
        );
    }

    getUserProfile(profileId, userId, platform) {
        const stmt = this.db.prepare(
            'SELECT * FROM user_profiles WHERE profile_id = ? AND user_id = ? AND platform = ?'
        );
        return stmt.get(profileId, userId, platform);
    }

    upsertUserProfile(profileId, userId, platform, userName = null, facts = {}) {
        const existing = this.getUserProfile(profileId, userId, platform);
        if (existing) {
            const currentFacts = JSON.parse(existing.facts_json || '{}');
            const mergedFacts = Object.assign({}, currentFacts, facts);
            const stmt = this.db.prepare(
                'UPDATE user_profiles SET user_name = COALESCE(?, user_name), facts_json = ?, rapport_level = MIN(rapport_level + 1, 10), last_interaction = CURRENT_TIMESTAMP WHERE id = ?'
            );
            stmt.run(userName, JSON.stringify(mergedFacts), existing.id);
            return this.getUserProfile(profileId, userId, platform);
        } else {
            const stmt = this.db.prepare(
                'INSERT INTO user_profiles (profile_id, user_id, platform, user_name, facts_json, rapport_level) VALUES (?, ?, ?, ?, ?, 1)'
            );
            stmt.run(profileId, userId, platform, userName, JSON.stringify(facts));
            return this.getUserProfile(profileId, userId, platform);
        }
    }

    recordMessage(profileId, userId, platform, sender, text, emotion = 'neutral') {
        const stmt = this.db.prepare(
            'INSERT INTO message_history (profile_id, user_id, platform, sender, message_text, emotion_state) VALUES (?, ?, ?, ?, ?, ?)'
        );
        return stmt.run(profileId, userId, platform, sender, text, emotion);
    }

    getRecentMessages(profileId, userId, platform, limit = 10) {
        const stmt = this.db.prepare(
            'SELECT sender, message_text, emotion_state, created_at FROM message_history WHERE profile_id = ? AND user_id = ? AND platform = ? ORDER BY id DESC LIMIT ?'
        );
        const rows = stmt.all(profileId, userId, platform, limit);
        return rows.reverse();
    }
}

import { PersonaEngine } from './persona_engine.js';
import { MemoryStore } from '../memory/memory_store.js';
import fetch from 'node-fetch';

const AI_PROXY_URL = process.env.AI_PROXY_URL || 'http://127.0.0.1:3000/ask';
const AI_PROXY_SECRET = process.env.AI_PROXY_SECRET || 'ngophuc_2026';

export class CompanionService {
    constructor() {
        this.personaEngine = new PersonaEngine();
        this.memoryStore = new MemoryStore();
    }

    async chat(profileId, userId, platform, incomingMessage, userName = null, conversationHistory = []) {
        // 1. Cập nhật hoặc lấy hồ sơ người dùng
        const userProfile = this.memoryStore.upsertUserProfile(profileId, userId, platform, userName);

        // 2. Lấy lịch sử tin nhắn gần đây để hội thoại liền mạch
        const recentMessages = this.memoryStore.getRecentMessages(profileId, userId, platform, 6);

        // 3. Xây dựng prompt chứa đầy đủ ngữ cảnh tâm lý và tri thức
        const { systemPrompt, emotion, matchedProduct } = this.personaEngine.buildSystemPrompt(
            profileId,
            userProfile,
            recentMessages,
            incomingMessage,
            conversationHistory
        );

        // 4. Lưu tin nhắn của khách vào SQLite
        this.memoryStore.recordMessage(profileId, userId, platform, 'user', incomingMessage);

        // 5. Gọi AI Proxy (Gemini) để sinh phản hồi
        let replyText = 'Dạ mình đây nè! Đợi mình một xíu xiu nha 🤍';
        try {
            const resp = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-secret-key': AI_PROXY_SECRET
                },
                body: JSON.stringify({
                    question: systemPrompt,
                    provider: 'gemini'
                }),
                timeout: 30000
            });

            if (resp.ok) {
                const data = await resp.json();
                let ans = (data.answer || data.response || '').trim();
                // Bỏ ngoặc kép nếu có
                ans = ans.replace(/^["'`]|["'`]$/g, '').trim();
                if (ans.length > 0) {
                    replyText = ans;
                }
            }
        } catch (err) {
            console.error('[CompanionService] Lỗi khi gọi AI Proxy:', err.message);
        }

        // 6. Lưu câu trả lời của bot vào SQLite
        this.memoryStore.recordMessage(profileId, userId, platform, 'bot', replyText, emotion.mood);

        // 7. Tính toán độ trễ gõ phím tự nhiên như người thật (Typing Delay)
        // Trung bình con người gõ 30-50ms / ký tự + 1-2s thời gian đọc suy nghĩ
        const typingDelayMs = Math.min(Math.max(replyText.length * 40 + 1500, 2500), 8000);

        return {
            success: true,
            profileId,
            userId,
            replyText,
            typingDelayMs,
            emotionState: emotion,
            recommendedProduct: matchedProduct
        };
    }
}

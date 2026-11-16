/**
 * Quản lý hàng đợi tin nhắn thông minh & Điều phối nhịp sinh hoạt (Queue & Priority Dispatcher)
 * Giải quyết:
 * 1. Chống trôi tin nhắn khi ngủ đêm / kẹt xe (lưu vào SQLite kèm thread_id và scheduled_at)
 * 2. Phân tầng ưu tiên: Hỏi mua đồ rep nhanh (3-5p), tán gẫu vu vơ rep theo giờ sinh hoạt
 * 3. Chống bot-to-bot loop & spam: Giới hạn tối đa 5-8 lượt chat/người/ngày nếu chưa có tương tác sâu
 * 4. Chống ảo giác link affiliate: LLM chỉ trả về item_id, code tự bốc link thật chèn vào
 */
export class MessageQueueService {
    constructor(memoryStore, circadianEngine, personaEngine) {
        this.memoryStore = memoryStore;
        this.circadianEngine = circadianEngine;
        this.personaEngine = personaEngine;
        this.initQueueTable();
    }

    initQueueTable() {
        this.memoryStore.db.exec(`
            CREATE TABLE IF NOT EXISTS message_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                thread_id TEXT,
                platform TEXT NOT NULL,
                user_name TEXT,
                incoming_text TEXT NOT NULL,
                intent TEXT DEFAULT 'GENERAL',
                status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED, MUTED
                scheduled_at DATETIME NOT NULL,
                prepared_reply TEXT,
                item_id TEXT,
                attempts INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON message_queue(status, scheduled_at);
        `);
    }

    /**
     * Tiếp nhận tin nhắn mới và tính toán thời gian phản hồi theo Phân Tầng Ưu Tiên
     */
    async enqueueMessage(profileId, userId, threadId, platform, messageText, userName = null, userAnalysis = {}) {
        // 1. Kiểm tra giới hạn chống bot-to-bot loop & spam (Tối đa 8 lượt/ngày cho người lạ)
        const dailyCountStmt = this.memoryStore.db.prepare(`
            SELECT COUNT(*) as count FROM message_history 
            WHERE profile_id = ? AND user_id = ? AND sender = 'bot' AND created_at >= date('now', 'start of day')
        `);
        const todayBotReplies = dailyCountStmt.get(profileId, userId)?.count || 0;

        if (todayBotReplies >= 10 && (userAnalysis.primaryNeed === 'GENERAL_CHIT_CHAT' || userAnalysis.primaryNeed === 'CASUAL_HELLO')) {
            console.log(`[MessageQueue] Người dùng [${userId}] đã đạt giới hạn 10 tin nhắn/ngày. Tạm dừng rep để chống bot loop.`);
            return {
                queued: false,
                reason: 'DAILY_RATE_LIMIT_REACHED'
            };
        }

        // 2. Tính toán nhịp sinh học & độ trễ phân tầng
        const routine = this.circadianEngine.getCurrentRoutineState();
        let delayMinutes = 3; // Mặc định 3 phút

        // PHÂN TẦNG ƯU TIÊN:
        if (routine.status === 'SLEEPING') {
            // Đêm ngủ: Chờ đến 7h15 sáng mai mới rep
            const now = new Date();
            const tomorrowMorning = new Date(now.getTime() + (7 * 60 * 60 * 1000));
            tomorrowMorning.setUTCHours(7, 15, 0, 0); // 7h15 VN
            const diffMs = tomorrowMorning.getTime() - (now.getTime() + 7 * 60 * 60 * 1000);
            delayMinutes = Math.max(Math.round(diffMs / 60000), 15);
        } else if (userAnalysis.primaryNeed === 'PRODUCT_INTEREST') {
            // Khách hỏi mua đồ ban ngày: Ưu tiên rep nhanh trong 2 - 5 phút (tránh khách thoát)
            delayMinutes = Math.floor(Math.random() * 3) + 2;
        } else if (routine.status === 'COMMUTING') {
            // Đang kẹt xe ngoài đường: Delay 20 - 40 phút
            delayMinutes = Math.floor(Math.random() * 20) + 20;
        } else if (routine.status === 'EVENING_CHORES') {
            // Nấu cơm tắm rửa: Delay 15 - 35 phút
            delayMinutes = Math.floor(Math.random() * 20) + 15;
        } else {
            // Giờ làm việc hoặc tối thảnh thơi: Delay 2 - 8 phút
            delayMinutes = Math.floor(Math.random() * (routine.maxDelayMinutes - routine.minDelayMinutes + 1)) + routine.minDelayMinutes;
        }

        const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

        // 3. Đưa vào bảng hàng đợi SQLite
        const insertStmt = this.memoryStore.db.prepare(`
            INSERT INTO message_queue (profile_id, user_id, thread_id, platform, user_name, incoming_text, intent, scheduled_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const res = insertStmt.run(profileId, userId, threadId, platform, userName, messageText, userAnalysis.primaryNeed, scheduledAt);

        console.log(`[MessageQueue] Đã lên lịch trả lời [${userName || userId}] sau ${delayMinutes} phút (vào lúc: ${scheduledAt})`);

        return {
            queued: true,
            queueId: res.lastInsertRowid,
            delayMinutes,
            scheduledAt,
            intent: userAnalysis.primaryNeed
        };
    }

    /**
     * Quét các tin nhắn đã đến giờ phản hồi (Được gọi mỗi phút bởi Background Worker)
     */
    getPendingReplies() {
        const stmt = this.memoryStore.db.prepare(`
            SELECT * FROM message_queue
            WHERE status = 'PENDING' AND scheduled_at <= datetime('now')
            ORDER BY id ASC LIMIT 5
        `);
        return stmt.all();
    }

    markAsSent(queueId) {
        this.memoryStore.db.prepare(`UPDATE message_queue SET status = 'SENT' WHERE id = ?`).run(queueId);
    }

    markAsFailed(queueId) {
        this.memoryStore.db.prepare(`UPDATE message_queue SET attempts = attempts + 1, status = CASE WHEN attempts >= 3 THEN 'FAILED' ELSE 'PENDING' END WHERE id = ?`).run(queueId);
    }
}

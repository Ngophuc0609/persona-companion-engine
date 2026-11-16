import express from 'express';
import { CompanionService } from './core/companion_service.js';

const app = express();
app.use(express.json());

const companion = new CompanionService();
const PORT = process.env.PORT || 3001;

// API Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'persona-companion-engine', uptime: process.uptime() });
});

// API Chat Core: Nhận tin nhắn từ bất kỳ nền tảng nào và trả về lời thoại tự nhiên
app.post('/api/chat', async (req, res) => {
    try {
        const { profileId = 'nguyen_van', userId, platform = 'facebook', message, userName } = req.body;
        if (!userId || !message) {
            return res.status(400).json({ error: 'Thiếu tham số userId hoặc message' });
        }

        const result = await companion.chat(profileId, userId, platform, message, userName);
        res.json(result);
    } catch (err) {
        console.error('Lỗi khi xử lý chat:', err);
        res.status(500).json({ error: err.message });
    }
});

// API Tra cứu hồ sơ nhân cách
app.get('/api/profiles/:id', (req, res) => {
    const p = companion.personaEngine.getProfile(req.params.id);
    if (!p) return res.status(404).json({ error: 'Profile not found' });
    res.json(p);
});

// API Lấy lịch sử tương tác của 1 người dùng
app.get('/api/history', (req, res) => {
    const { profileId = 'nguyen_van', userId, platform = 'facebook', limit = 20 } = req.query;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
    const history = companion.memoryStore.getRecentMessages(profileId, userId, platform, parseInt(limit, 10));
    res.json(history);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Persona Companion Engine] Server đang chạy tại cổng http://127.0.0.1:${PORT}`);
});

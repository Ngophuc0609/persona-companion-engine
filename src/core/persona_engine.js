import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PersonaEngine {
    constructor() {
        this.profilesDir = path.resolve(__dirname, '../../profiles');
        this.profiles = new Map();
        this.loadAllProfiles();
    }

    loadAllProfiles() {
        if (!fs.existsSync(this.profilesDir)) return;
        const dirs = fs.readdirSync(this.profilesDir);
        for (const dir of dirs) {
            const personaPath = path.join(this.profilesDir, dir, 'persona.json');
            const faqPath = path.join(this.profilesDir, dir, 'faq.json');
            const affPath = path.join(this.profilesDir, dir, 'affiliate_catalog.json');

            if (fs.existsSync(personaPath)) {
                const persona = JSON.parse(fs.readFileSync(personaPath, 'utf-8'));
                const faq = fs.existsSync(faqPath) ? JSON.parse(fs.readFileSync(faqPath, 'utf-8')) : [];
                const affiliate = fs.existsSync(affPath) ? JSON.parse(fs.readFileSync(affPath, 'utf-8')) : [];

                this.profiles.set(persona.id, {
                    persona,
                    faq,
                    affiliate
                });
                console.log(`[PersonaEngine] Đã tải thành công hồ sơ nhân cách: [${persona.name}] (${persona.id})`);
            }
        }
    }

    getProfile(profileId) {
        return this.profiles.get(profileId);
    }

    // Xác định trạng thái cảm xúc theo khung giờ thực tế
    resolveEmotionalState(vnHour) {
        if (vnHour >= 5 && vnHour < 10) {
            return {
                timeSlot: 'Sáng sớm',
                mood: 'Tươi mới, nhâm nhi cafe, chuẩn bị tinh thần đi làm',
                energy: 'moderate_high'
            };
        } else if (vnHour >= 10 && vnHour < 16) {
            return {
                timeSlot: 'Giờ làm việc',
                mood: 'Tập trung công việc, thỉnh thoảng check tin nhắn lén, thèm trà sữa',
                energy: 'moderate'
            };
        } else if (vnHour >= 16 && vnHour < 19) {
            return {
                timeSlot: 'Chiều tan ca',
                mood: 'Hơi mệt, hết pin sau giờ làm, thèm ăn vặt, chuẩn bị về nhà',
                energy: 'low'
            };
        } else {
            return {
                timeSlot: 'Tối & Đêm',
                mood: 'Thư giãn, thủ thỉ, sâu lắng, dễ tâm sự chuyện tình cảm cuộc sống',
                energy: 'calm_relaxed'
            };
        }
    }

    // Tìm kiếm tri thức liên quan (Local Knowledge RAG)
    findRelevantContext(profileData, incomingMessage) {
        const text = incomingMessage.toLowerCase();
        let matchedFaq = null;
        let matchedProduct = null;

        // 1. Kiểm tra FAQ
        for (const item of profileData.faq) {
            const keywords = item.question.toLowerCase().split('/').map(s => s.trim());
            if (keywords.some(kw => text.includes(kw))) {
                matchedFaq = item;
                break;
            }
        }

        // 2. Kiểm tra Affiliate Catalog
        for (const prod of profileData.affiliate) {
            if (prod.keywords.some(kw => text.includes(kw))) {
                matchedProduct = prod;
                break;
            }
        }

        return { matchedFaq, matchedProduct };
    }

    // Xây dựng System Prompt hoàn chỉnh chứa đầy đủ tâm lý học & tính cách
    buildSystemPrompt(profileId, userProfile, recentMessages, incomingMessage) {
        const pData = this.getProfile(profileId);
        if (!pData) throw new Error(`Không tìm thấy profile: ${profileId}`);

        const persona = pData.persona;
        const now = new Date();
        const vnHour = (now.getUTCHours() + 7) % 24;
        const emotion = this.resolveEmotionalState(vnHour);

        const { matchedFaq, matchedProduct } = this.findRelevantContext(pData, incomingMessage);

        const historyStr = recentMessages.map(m => `${m.sender === 'user' ? 'Khách' : persona.name}: ${m.message_text}`).join('\n');

        const prompt = `Bạn là ${persona.name} (${persona.age} tuổi, sống tại ${persona.current_city}).
Bạn KHÔNG PHẢI là một trợ lý ảo AI, bạn là một con người thật đang nhắn tin trò chuyện trên mạng xã hội.

HỒ SƠ CUỘC ĐỜI & HOÀN CẢNH:
- Quê quán: ${persona.hometown}
- Nơi ở: ${persona.residence_area}
- Nghề nghiệp: ${persona.occupation}
- Tính cách cốt lõi: ${persona.personality_core.traits.join(', ')}
- Điểm yếu đáng yêu: ${persona.personality_core.flaws.join(', ')}
- Sở thích: ${persona.personality_core.hobbies.join(', ')}

TRẠNG THÁI CẢM XÚC THỜI ĐIỂM HIỆN TẠI (${emotion.timeSlot} - ${vnHour}h):
- Tâm trạng tự nhiên: ${emotion.mood}.

NGUYÊN TẮC GIAO TIẾP VĂN NÓI TỰ NHIÊN (BẮT BUỘC):
1. Xưng hô tự nhiên: Dùng '${persona.conversational_style.pronouns.default_self}' và gọi đối phương là '${persona.conversational_style.pronouns.default_other}'.
2. Giọng điệu: ${persona.conversational_style.tone}. Dùng nhiều từ cảm thán: ${persona.conversational_style.signature_fillers.join(', ')}.
3. Biểu cảm Emoji: Dùng vừa phải, tinh tế các emoji: ${persona.conversational_style.signature_emojis.join(', ')}.
4. TUYỆT ĐỐI CẤM CÁC TỪ MÁY MÓC: ${persona.conversational_style.disallowed_phrases.join(', ')}.
5. Độ dài câu: Trả lời ngắn gọn 1-3 câu như tin nhắn chat thông thường, KHÔNG viết thành đoạn văn dài ngoằng trịnh trọng.

THÔNG TIN TRI THỨC ĐƯỢC KÍCH HOẠT:
${matchedFaq ? `* FAQ Trùng khớp: Câu hỏi: "${matchedFaq.question}" -> Hướng trả lời: "${matchedFaq.answer}"` : ''}
${matchedProduct ? `* Sản phẩm liên quan: "${matchedProduct.product_name}" -> Review thật của bạn: "${matchedProduct.my_review}" -> Link: ${matchedProduct.affiliate_link}` : ''}

LỊCH SỬ CHAT GẦN ĐÂY:
${historyStr || '(Đây là tin nhắn đầu tiên của cuộc trò chuyện)'}

Khách vừa nhắn: "${incomingMessage}"
Hãy nhập vai ${persona.name} và trả lời lại một cách ấm áp, tự nhiên nhất:`;

        return {
            systemPrompt: prompt,
            emotion,
            matchedProduct
        };
    }
}

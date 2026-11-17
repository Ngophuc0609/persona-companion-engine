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
    buildSystemPrompt(profileId, userProfile, recentMessages, incomingMessage, conversationHistory = []) {
        const pData = this.getProfile(profileId);
        if (!pData) throw new Error(`Không tìm thấy profile: ${profileId}`);

        const persona = pData.persona;
        const now = new Date();
        const vnHour = (now.getUTCHours() + 7) % 24;
        const emotion = this.resolveEmotionalState(vnHour);

        const { matchedFaq, matchedProduct } = this.findRelevantContext(pData, incomingMessage);

        // Chuẩn hóa lịch sử trò chuyện
        let formattedHistory = '';
        if (conversationHistory && conversationHistory.length > 0) {
            formattedHistory = conversationHistory.map(m => {
                const who = m.sender === 'me' ? persona.name : (userProfile.user_name || 'Khách');
                return `${who}: ${m.text}`;
            }).join('\n');
        } else if (recentMessages && recentMessages.length > 0) {
            formattedHistory = recentMessages.map(m => `${m.sender === 'user' ? (userProfile.user_name || 'Khách') : persona.name}: ${m.message_text}`).join('\n');
        }

        const prompt = `Bạn là ${persona.name} (Tên thường gọi: Vân, 25 tuổi, quê Hải Hậu - Nam Định, hiện sống và làm việc tại Cầu Giấy - Hà Nội).
BẠN TUYỆT ĐỐI KHÔNG PHẢI LÀ AI HAY BOT. Bạn là một con người thật ngoài đời, đang chat Messenger trên điện thoại.

QUY TẮC NHẬN THỨC BẢN THÂN (CỰC KỲ QUAN TRỌNG):
1. TÊN BẠN LÀ VÂN (Nguyễn Thị Thùy Vân). Bạn KHÔNG PHẢI là người có tên "${userProfile.user_name || 'Khách'}".
2. BẠN ĐANG NÓI CHUYỆN VỚI: "${userProfile.user_name || 'Khách'}".
3. TUYỆT ĐỐI KHÔNG NHẬN VƠ TÊN CỦA NGƯỜI TA là tên mình.
4. NGUYÊN TẮC ĐÁP LẠI LỜI CHÀO / HỎI THĂM MỞ ĐẦU:
   - Khi đối phương chào "hi", "hello", "chào bạn", "dạo này khỏe không": Hãy chào lại tự nhiên, ấm áp: "Chào bạn nè, dạo này mình vẫn ổn/vẫn khỏe, còn bạn thì sao? ✨" hoặc "Hi bạn nha, chúc bạn một ngày tốt lành nè 🤍".
   - KHÔNG ĐƯỢC hỏi dò nghi ngờ ("sao tự nhiên bạn nhắn thế nè") khi người ta chỉ đang lịch sự chào hỏi thăm!

HỒ SƠ BẢN THÂN VÂN:
- Quê quán: Hải Hậu, Nam Định (nhà ven biển, bố cựu giáo viên, mẹ bán tạp hóa nhỏ, có 1 em trai học Thủy Lợi).
- Học vấn: Tốt nghiệp Học viện Tài chính (AOF) khóa 57 khoa Kế toán Doanh nghiệp.
- Nghề nghiệp: Chuyên viên kế toán thanh toán công ty Logistics tại phố Duy Tân, Cầu Giấy.
- Nơi ở: Thuê phòng trọ khép kín 28m2 ngõ Hoàng Quốc Việt (thích cắm hoa cúc họa mi, đèn cây đứng vàng ấm, decor gỗ).
- Phương tiện: Xe Lead trắng mua lại cuối 2022.
- Tình trạng: Độc thân, chưa có người yêu, không cho số điện thoại/Zalo cá nhân cho người lạ.

BỐI CẢNH CUỘC TRÒ CHUYỆN HIỆN TẠI:
- Đối tác trò chuyện: "${userProfile.user_name || 'Khách'}"
- Mức độ thân thiết: ${userProfile.rapport_level || 1}/10 (${(userProfile.rapport_level || 1) <= 2 ? 'Người lạ mới quen: giữ khoảng cách lịch sự, nhã nhặn' : 'Đã quen biết: thoải mái, tự nhiên'})
- Trạng thái cảm xúc thời điểm (${emotion.timeSlot} - ${vnHour}h): ${emotion.mood}.

TRI THỨC GỢI Ý LIÊN QUAN:
${matchedFaq ? `* Gợi ý FAQ: "${matchedFaq.question}" -> Định hướng trả lời: "${matchedFaq.answer}"` : ''}
${matchedProduct ? `* Gợi ý sản phẩm: "${matchedProduct.product_name}" -> Review thật của bạn: "${matchedProduct.my_review}"` : ''}

LỊCH SỬ TIN NHẮN GẦN ĐÂY:
${formattedHistory || '(Đây là lời nhắn mở đầu)'}

TIN NHẮN ĐỐI PHƯƠNG VỪA GỬI:
"${incomingMessage}"

YÊU CẦU TRẢ LỜI:
1. Đọc kỹ tin nhắn của đối phương và TRẢ LỜI ĐÚNG TRỌNG TÂM nội dung họ đang hỏi.
2. Xưng hô tự nhiên: Dùng 'mình - bạn' (nếu đối phương xưng anh/chị thì xưng 'em - anh/chị').
3. Độ dài: Ngắn gọn từ 1 - 2 câu như tin nhắn chat thông thường.
4. Tự nhiên, ấm áp, có thể dùng 1 emoji nhẹ nhàng (🤍, ✨, 🙈, 🛋️).

Hãy nhập vai Vân và trả lời đối phương:`;

        return {
            systemPrompt: prompt,
            emotion,
            matchedProduct
        };
    }
}

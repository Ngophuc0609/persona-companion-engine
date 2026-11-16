/**
 * Bộ phân tích tâm lý & hồ sơ người dùng động (User Profiler)
 * Kết hợp dữ liệu crawl từ Facebook Profile + Tin nhắn đang chat
 */
export class UserProfiler {
    constructor() {}

    /**
     * Phân tích đối tượng dựa trên thông tin Profile (crawled) và tin nhắn đầu vào
     */
    analyzeUser(crawledProfile = {}, messageText = '', history = []) {
        const text = (messageText || '').toLowerCase().trim();
        const introText = (crawledProfile.introItems || []).join(' ').toLowerCase();

        // 1. Nhận diện giới tính & tuổi tác để xưng hô chuẩn xác
        let estimatedGender = 'unknown'; // 'male', 'female', 'unknown'
        let pronounToUse = { self: 'mình', other: 'bạn' };

        // Phân tích từ tên và thông tin intro
        const name = (crawledProfile.fullName || '').toLowerCase();
        if (name.includes('anh') || name.includes('văn') || name.includes('tuấn') || name.includes('quân') || name.includes('hoàng') || name.includes('đức') || name.includes('nam')) {
            estimatedGender = 'male';
        } else if (name.includes('thị') || name.includes('hương') || name.includes('linh') || name.includes('ngọc') || name.includes('trang') || name.includes('mai')) {
            estimatedGender = 'female';
        }

        // Nhận diện xưng hô từ lời chào của khách
        if (text.includes('anh ') || text.startsWith('anh ') || text.includes('e ơi') || text.includes('em ơi')) {
            pronounToUse = { self: 'em', other: 'anh' };
        } else if (text.includes('chị ') || text.startsWith('chị ')) {
            pronounToUse = { self: 'em', other: 'chị' };
        }

        // 2. Phân loại nhóm tính cách theo hành vi giao tiếp (DISC & Tone)
        let discStyle = 'S_Steady'; // Mặc định
        if (text.length < 15 && !text.includes('ạ') && !text.includes('ơi')) {
            discStyle = 'D_Direct'; // Cộc lốc, ngắn gọn: "b bán gì à", "ở đâu"
        } else if (text.includes('haha') || text.includes('hihi') || text.includes('khen') || text.includes('xinh') || text.includes('quen')) {
            discStyle = 'I_Influential'; // Thân thiện, thích làm quen, đùa cợt
        } else if (text.includes('sao') && (text.includes('bot') || text.includes('thế nào') || text.includes('ai vậy'))) {
            discStyle = 'C_Cautious'; // Săm soi, hoài nghi
        }

        // 3. Nhận diện Ý định & Nhu cầu (Intent & Need Detection)
        let primaryNeed = 'GENERAL_CHIT_CHAT';
        let suggestedResponseStrategy = '';

        if (text.includes('bán gì') || text.includes('mua') || text.includes('bao nhiêu') || text.includes('shop') || text.includes('giá')) {
            primaryNeed = 'PRODUCT_INTEREST';
            suggestedResponseStrategy = 'Khách tò mò về đồ bán/decor. Trả lời ngắn gọn mình không bán hàng, chỉ đăng ảnh cá nhân, không chủ động mồi chài.';
        } else if (text.includes('ở đâu') || text.includes('quê') || text.includes('bao nhiêu tuổi') || text.includes('sinh năm')) {
            primaryNeed = 'PERSONAL_CURIOSITY';
            suggestedResponseStrategy = 'Khách tò mò về đời tư/quê quán. Trả lời ngắn, giữ khoảng cách đề phòng nhẹ, không khai chi tiết ngõ ngách.';
        } else if (text.includes('yêu') || text.includes('làm quen') || text.includes('sđt') || text.includes('zalo') || text.includes('cafe không')) {
            primaryNeed = 'FLIRTING_OR_DATING';
            suggestedResponseStrategy = 'Khách có ý định tán tỉnh/làm quen sâu. Từ chối khéo léo, giữ ranh giới an toàn, không cho thông tin liên lạc ngoài.';
        } else {
            primaryNeed = 'CASUAL_HELLO';
            suggestedResponseStrategy = 'Chào hỏi lịch sự, thân thiện nhưng có kẽ hở an toàn.';
        }

        return {
            estimatedGender,
            pronounToUse,
            discStyle,
            primaryNeed,
            suggestedResponseStrategy,
            crawledSummary: {
                fullName: crawledProfile.fullName || 'Bạn',
                location: introText.includes('hà nội') ? 'Hà Nội' : 'Chưa rõ',
                notes: `Phong cách chat: ${discStyle} | Ý định: ${primaryNeed}`
            }
        };
    }
}

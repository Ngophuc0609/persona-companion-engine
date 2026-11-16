# Persona Companion Engine (Lõi AI Companion & Social Commerce Đa Nhân Cách)

> Nền tảng huấn luyện và điều phối bot trò chuyện thông minh có cảm xúc, mang tính cách và chiều sâu tâm lý con người thực tế, hỗ trợ tâm sự gắn kết và tư vấn bán hàng / Affiliate tự nhiên đa nền tảng.

---

## 1. Triết lý Thiết kế & Chiều sâu Nhân cách (Psychological Architecture)

Khác với các chatbot hỗ trợ khách hàng (CSKH) hay trợ lý ảo thông thường, **Persona Companion Engine** được xây dựng trên 3 nguyên tắc tâm lý học:
1. **Lắng nghe tích cực & Công nhận cảm xúc (Active Listening & Empathy Validation):** Không nhảy vào đưa lời khuyên hay lý thuyết máy móc; đồng cảm với cảm xúc của người trò chuyện trước.
2. **Hiệu ứng không hoàn hảo (Pratfall Effect):** Có tâm trạng theo thời gian (sáng nhiều năng lượng, chiều tan tầm mệt mỏi thèm ăn vặt, đêm thủ thỉ sâu lắng), biết thừa nhận điểm yếu nhỏ và có những thói quen vụng về đáng yêu.
3. **Bán hàng theo phong cách bạn bè review (Consultative Affiliate):** Không bao giờ spam link; chỉ chia sẻ trải nghiệm thật và đưa link shop uy tín khi bạn chat có nhu cầu thực tế.

---

## 2. Cấu trúc Thư mục Hệ thống

```
persona-companion-engine/
├── data/
│   └── conversations.sqlite      # Bộ nhớ ngữ cảnh & lịch sử hội thoại từng người
├── profiles/
│   └── nguyen_van/              # Hồ sơ nhân vật đầu tiên
│       ├── persona.json         # Hồ sơ tiểu sử cuộc đời, tính cách, giọng điệu
│       ├── faq.json             # Bộ câu hỏi thường gặp về đời sống cá nhân
│       └── affiliate_catalog.json # Danh mục sản phẩm review kèm link affiliate
├── src/
│   ├── core/
│   │   ├── persona_engine.js    # Lõi xử lý tâm lý, thời gian & lắp ráp prompt
│   │   └── companion_service.js # Điều phối trò chuyện, tính typing delay
│   ├── memory/
│   │   └── memory_store.js      # Trí nhớ dài hạn SQLite (Facts & History)
│   ├── index.js                 # REST API Gateway (POST /api/chat)
│   └── test_chat.js             # Kịch bản kiểm thử hội thoại
├── package.json
└── README.md
```

---

## 3. Hướng dẫn Khởi chạy & Sử dụng

### Cài đặt dependencies:
```bash
npm install
```

### Chạy thử kịch bản trò chuyện mẫu:
```bash
npm test
```

### Khởi động Server API:
```bash
npm start
# Server lắng nghe tại cổng http://127.0.0.1:3001
```

### API Endpoint:
* `POST /api/chat`
```json
{
  "profileId": "nguyen_van",
  "userId": "facebook_uid_123",
  "platform": "facebook",
  "message": "b bán gì à",
  "userName": "Phạm Quânn"
}
```
* Phản hồi trả về:
```json
{
  "success": true,
  "replyText": "Hihi không đâu nè, mình không phải shop bán hàng đâu á! Chỉ là đợt này rảnh rỗi...",
  "typingDelayMs": 6500,
  "emotionState": { "timeSlot": "Tối & Đêm", "mood": "Thư giãn, thủ thỉ, sâu lắng..." }
}
```

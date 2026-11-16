import { CompanionService } from './core/companion_service.js';

async function test() {
    const companion = new CompanionService();
    console.log('[*] Đang kiểm thử Companion Service với tin nhắn thực tế của khách...');
    
    // Test 1: Khách hỏi b bán gì à (đúng tin nhắn đang có trên Facebook Messenger)
    const res1 = await companion.chat(
        'nguyen_van',
        'pham_quann_123',
        'facebook',
        'b bán gì à',
        'Phạm Quânn'
    );

    console.log('\n--- KẾT QUẢ TEST 1 ---');
    console.log('Tin nhắn khách: "b bán gì à"');
    console.log('Cảm xúc hiện tại:', res1.emotionState.mood);
    console.log('Vân trả lời:', res1.replyText);
    console.log('Độ trễ gõ phím giả lập:', res1.typingDelayMs, 'ms');

    // Test 2: Khách hỏi tiếp về quê quán hoặc hỏi han
    const res2 = await companion.chat(
        'nguyen_van',
        'pham_quann_123',
        'facebook',
        'thế quê bạn ở đâu thế nhỉ, nhìn quen quen',
        'Phạm Quânn'
    );

    console.log('\n--- KẾT QUẢ TEST 2 (Hội thoại có nhớ ngữ cảnh) ---');
    console.log('Tin nhắn khách: "thế quê bạn ở đâu thế nhỉ, nhìn quen quen"');
    console.log('Vân trả lời:', res2.replyText);
}

test().catch(console.error);

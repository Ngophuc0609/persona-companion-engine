/**
 * Module điều phối Messenger không rủi ro (Zero-Navigation Messenger Bridge)
 * Thực hiện:
 * 1. Đóng popup PIN khôi phục nếu xuất hiện
 * 2. Đọc thông tin đối tượng trực tiếp tại thanh Sidebar bên phải (Không nhảy page tránh checkpoint)
 * 3. Gõ phím trả lời tự nhiên theo nhịp người thật
 */
export async function handleMessengerInbox(page, apiBaseUrl = 'http://127.0.0.1:3001') {
    console.log('[*] [MessengerBridge] Bắt đầu kiểm tra hộp thư Messenger...');

    // 1. Kiểm tra và đóng popup mã PIN nếu có
    const closedPinModal = await page.evaluate(() => {
        const closeBtn = document.querySelector('div[aria-label="Đóng"], div[aria-label="Close"], div[role="button"][tabindex="0"]');
        const modalText = document.body.innerText || '';
        if (modalText.includes('Nhập mã PIN để khôi phục') && closeBtn) {
            closeBtn.click();
            return true;
        }
        return false;
    });

    if (closedPinModal) {
        console.log('[+] [MessengerBridge] Đã đóng popup mã PIN thành công.');
        await new Promise(r => setTimeout(r, 1500));
    }

    // 2. Tìm cuộc hội thoại chưa đọc hoặc cuộc hội thoại mới nhất
    const conversationInfo = await page.evaluate(() => {
        // Tìm các item trong danh sách chat bên trái
        const chatRows = Array.from(document.querySelectorAll('div[role="row"], div[role="gridcell"], a[href*="/messages/t/"]'));
        if (chatRows.length === 0) return null;

        // Ưu tiên dòng có chấm xanh unread hoặc dòng đầu tiên
        let targetRow = chatRows.find(r => r.innerText && (r.innerText.includes('Chưa đọc') || r.querySelector('div[aria-label*="chưa đọc"]'))) || chatRows[0];
        
        let threadHref = '';
        const link = targetRow.querySelector('a[href*="/messages/t/"]') || targetRow.closest('a');
        if (link) threadHref = link.getAttribute('href');

        const lines = (targetRow.innerText || '').split('\n').map(s => s.trim()).filter(Boolean);
        const senderName = lines[0] || 'Khách';
        const lastMessage = lines[1] || '';

        return {
            threadHref,
            senderName,
            lastMessage
        };
    });

    if (!conversationInfo) {
        console.log('[-] [MessengerBridge] Không tìm thấy cuộc hội thoại nào.');
        return { success: false, reason: 'NO_CONVERSATIONS_FOUND' };
    }

    console.log(`[+] [MessengerBridge] Đang tương tác với khách: [${conversationInfo.senderName}] | Tin nhắn gần nhất: "${conversationInfo.lastMessage}"`);

    // 3. Trích xuất thông tin người dùng từ thanh Sidebar bên phải (Right Sidebar Inspection - CỰC KỲ AN TOÀN)
    const sidebarInfo = await page.evaluate(() => {
        const sidebar = document.querySelector('div[role="complementary"]');
        if (!sidebar) return { bio: '', location: '' };

        const text = sidebar.innerText || '';
        return {
            sidebarText: text.slice(0, 500)
        };
    });

    return {
        success: true,
        conversationInfo,
        sidebarInfo
    };
}

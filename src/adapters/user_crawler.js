/**
 * Module thu thập thông tin hồ sơ người dùng Facebook để phục vụ cá nhân hóa hội thoại
 */
export async function crawlUserProfile(page, userProfileUrl) {
    if (!userProfileUrl) return null;
    console.log(`[*] [Crawler] Bắt đầu thu thập thông tin hồ sơ: ${userProfileUrl}`);
    
    // Mở trang cá nhân trong tab ẩn hoặc điều hướng
    await page.goto(userProfileUrl, { waitUntil: 'networkidle2', timeout: 35000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2500));

    const profileData = await page.evaluate(() => {
        const data = {
            fullName: '',
            bio: '',
            introItems: [],
            estimatedGender: 'unknown',
            estimatedAgeGroup: 'unknown',
            interests: []
        };

        // 1. Lấy tên hiển thị
        const h1 = document.querySelector('h1');
        if (h1) data.fullName = h1.innerText.trim();

        // 2. Lấy tiểu sử (Bio)
        const bioEls = Array.from(document.querySelectorAll('div[dir="auto"], span')).filter(el => {
            const p = el.parentElement;
            return p && p.innerText && el.innerText.length > 5 && el.innerText.length < 150;
        });

        // 3. Lấy các dòng Giới thiệu (Intro: Quê quán, Nơi ở, Nghề nghiệp, Trường học)
        const introContainers = Array.from(document.querySelectorAll('ul, div')).filter(el => {
            const text = el.innerText || '';
            return text.includes('Sống tại') || text.includes('Đến từ') || text.includes('Làm việc tại') || text.includes('Từng học tại');
        });

        if (introContainers.length > 0) {
            const lines = introContainers[0].innerText.split('\n').map(s => s.trim()).filter(Boolean);
            data.introItems = lines.slice(0, 8);
        }

        return data;
    });

    console.log(`[+] [Crawler] Thu thập thành công:`, JSON.stringify(profileData));
    return profileData;
}

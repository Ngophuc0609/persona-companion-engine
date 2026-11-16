/**
 * Quản lý nhịp sinh hoạt đời thực của Nguyễn Vân (Circadian Rhythm & Life Schedule Engine)
 * Quyết định: Khi nào trả lời? Trả lời nhanh hay chậm? Bối cảnh hiện tại Vân đang làm gì?
 */
export class CircadianScheduleEngine {
    constructor() {}

    /**
     * Lấy trạng thái hoạt động thực tế của Vân theo thời gian UTC+7
     */
    getCurrentRoutineState(currentDate = new Date()) {
        const vnDate = new Date(currentDate.getTime() + (7 * 60 * 60 * 1000));
        const hour = vnDate.getUTCHours();
        const minute = vnDate.getUTCMinutes();
        const dayOfWeek = vnDate.getUTCDay(); // 0: Chủ Nhật, 1-5: T2-T6, 6: Thứ 7

        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const timeFloat = hour + minute / 60;

        // 1. Khung giờ ĐI NGỦ (23h30 - 06h30)
        if (timeFloat >= 23.5 || timeFloat < 6.5) {
            return {
                status: 'SLEEPING',
                canReplyImmediately: false,
                activity: 'Đang ngủ say giấc',
                contextNote: 'Vân đã đi ngủ, điện thoại để chế độ Không làm phiền. Tuyệt đối không trả lời ngay trong đêm, chỉ xem và rep vào sáng hôm sau.',
                minDelayMinutes: 360, // Sáng mai mới rep
                toneHint: 'ngái ngủ, tỉnh giấc chào ngày mới'
            };
        }

        // 2. Khung giờ THỨC DẬY & CHUẨN BỊ ĐI LÀM (06h30 - 08h00)
        if (timeFloat >= 6.5 && timeFloat < 8.0) {
            return {
                status: 'MORNING_ROUTINE',
                canReplyImmediately: isWeekend ? false : true,
                activity: isWeekend ? 'Ngủ nướng cuối tuần' : 'Vệ sinh cá nhân, thay đồ, pha cafe, dắt xe đi làm',
                contextNote: 'Đang bận chuẩn bị đi làm hoặc đi đường, thỉnh thoảng liếc điện thoại rep ngắn 1 câu.',
                minDelayMinutes: 5,
                maxDelayMinutes: 25,
                toneHint: 'hơi vội vàng hoặc thảnh thơi nhâm nhi cafe'
            };
        }

        // 3. Khung giờ ĐI ĐƯỜNG / KẸT XE GIỜ CAO ĐIỂM (08h00 - 08h45 & 17h30 - 18h30)
        if ((timeFloat >= 8.0 && timeFloat < 8.75) || (timeFloat >= 17.5 && timeFloat < 18.5)) {
            return {
                status: 'COMMUTING',
                canReplyImmediately: false,
                activity: 'Đang chạy xe ngoài đường (đoạn Cầu Giấy - Kim Mã kẹt xe)',
                contextNote: 'Đang lái xe máy, không thể dùng điện thoại. Phải đợi đến công ty hoặc về đến phòng trọ mới rep.',
                minDelayMinutes: 20,
                maxDelayMinutes: 45,
                toneHint: 'vừa tới nơi thở phào, cởi khẩu trang áo chống nắng'
            };
        }

        // 4. Khung giờ LÀM VIỆC CA SÁNG (08h45 - 11h45)
        if (timeFloat >= 8.75 && timeFloat < 11.75) {
            return {
                status: 'WORKING_MORNING',
                canReplyImmediately: true,
                activity: 'Ngồi văn phòng xử lý hóa đơn, chứng từ kế toán',
                contextNote: 'Đang làm việc tại công ty, chỉ thỉnh thoảng tranh thủ lướt điện thoại giờ giải lao hoặc lúc rảnh tay.',
                minDelayMinutes: 3,
                maxDelayMinutes: 20,
                toneHint: 'trả lời ngắn gọn, đang ngồi máy tính làm việc'
            };
        }

        // 5. Khung giờ NGHỈ TRƯA & CƠM TRƯA (11h45 - 13h30)
        if (timeFloat >= 11.75 && timeFloat < 13.5) {
            return {
                status: 'LUNCH_BREAK',
                canReplyImmediately: true,
                activity: 'Đi ăn cơm trưa với đồng nghiệp, uống trà sữa, chợp mắt 20 phút',
                contextNote: 'Thời gian rảnh rỗi nhất ban ngày, cầm điện thoại lướt mạng và rep tin nhắn nhanh.',
                minDelayMinutes: 1,
                maxDelayMinutes: 8,
                toneHint: 'vui vẻ, thoải mái, hay nói về ăn uống ngủ trưa'
            };
        }

        // 6. Khung giờ LÀM VIỆC CA CHIỀU (13h30 - 17h30)
        if (timeFloat >= 13.5 && timeFloat < 17.5) {
            return {
                status: 'WORKING_AFTERNOON',
                canReplyImmediately: true,
                activity: 'Làm việc ca chiều, đối soát sổ sách cuối ngày',
                contextNote: 'Khá bận rộn vì dồn việc cuối ngày, rep chậm và ngắn.',
                minDelayMinutes: 5,
                maxDelayMinutes: 35,
                toneHint: 'hơi mệt, mong tan làm, thèm trà sữa'
            };
        }

        // 7. Khung giờ NẤU CƠM / ĂN TỐI / TẮM RỬA (18h30 - 20h30)
        if (timeFloat >= 18.5 && timeFloat < 20.5) {
            return {
                status: 'EVENING_CHORES',
                canReplyImmediately: false,
                activity: 'Nấu cơm tối góc bếp phòng trọ, rửa bát, giặt đồ, tắm gội',
                contextNote: 'Đang bận việc nhà buông điện thoại ra ngoài, rep sau khi tắm rửa xong.',
                minDelayMinutes: 15,
                maxDelayMinutes: 50,
                toneHint: 'vừa ăn xong hoặc vừa tắm xong thơm tho'
            };
        }

        // 8. Khung giờ VÀNG THẢNH THƠI & TÂM SỰ (20h30 - 23h30)
        return {
            status: 'PRIME_CHATTING_TIME',
            canReplyImmediately: true,
            activity: 'Nằm ôm chăn, đốt nến thơm, lướt điện thoại ngắm đồ decor, nghe nhạc chill',
            contextNote: 'Thời điểm tâm sự lý tưởng nhất trong ngày. Rảnh tay, sẵn sàng trò chuyện lâu và sâu sắc.',
            minDelayMinutes: 0.5,
            maxDelayMinutes: 5,
            toneHint: 'thủ thỉ, sâu lắng, ấm áp, nhiều cảm xúc'
        };
    }
}

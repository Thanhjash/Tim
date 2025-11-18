import { NextRequest, NextResponse } from 'next/server';
import { extractExpenseInfo, isReportRequest } from '@/lib/gemini';
import { checkDuplicates, saveTransaction } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Simple session storage (in production, use Redis or similar)
const sessions = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // For demo purposes, using a fixed user ID
    // In production, implement proper authentication
    const userId = 'demo-user';
    const sessionId = request.cookies.get('session_id')?.value || uuidv4();

    // Check if this is a report request
    if (isReportRequest(message)) {
      return NextResponse.json({
        reply: '📊 Đang tạo báo cáo... Vui lòng gọi /api/report để xem báo cáo chi tiết.',
        state: 'report_redirect'
      });
    }

    // Get or create session
    let session = sessions.get(sessionId) || { state: 'idle' };

    // Handle confirmation responses
    if (session.state === 'awaiting_confirmation') {
      const lowerMessage = message.toLowerCase().trim();

      if (['có', 'ok', 'yes', 'đúng', 'lưu', 'oke'].some(keyword => lowerMessage.includes(keyword))) {
        // Save the transaction
        const { extracted } = session;
        const today = new Date().toISOString().split('T')[0];

        try {
          saveTransaction({
            id: uuidv4(),
            user_id: userId,
            amount: extracted.amount,
            category: extracted.category,
            description: extracted.description,
            transaction_date: today,
            raw_input: session.originalMessage,
            ai_confidence: extracted.confidence,
            metadata: { session_id: sessionId }
          });

          // Clear session
          sessions.delete(sessionId);

          return NextResponse.json({
            reply: '✅ Đã lưu giao dịch thành công!\n\nNhập giao dịch tiếp theo hoặc gõ "báo cáo" để xem thống kê.',
            state: 'saved'
          });
        } catch (error) {
          console.error('Database error:', error);
          return NextResponse.json({
            reply: '❌ Có lỗi khi lưu giao dịch. Vui lòng thử lại.',
            state: 'error'
          });
        }
      } else if (['không', 'no', 'thôi', 'hủy', 'cancel'].some(keyword => lowerMessage.includes(keyword))) {
        sessions.delete(sessionId);
        return NextResponse.json({
          reply: '❌ Đã hủy. Nhập lại giao dịch nếu bạn muốn.',
          state: 'cancelled'
        });
      } else if (['sửa', 'edit', 'chỉnh'].some(keyword => lowerMessage.includes(keyword))) {
        sessions.delete(sessionId);
        return NextResponse.json({
          reply: 'Được rồi! Vui lòng nhập lại thông tin chi tiêu.',
          state: 'edit'
        });
      } else {
        return NextResponse.json({
          reply: 'Xin lỗi, tôi không hiểu. Bạn muốn LƯU, HỦY, hay SỬA giao dịch này?',
          state: 'awaiting_confirmation'
        });
      }
    }

    // Handle duplicate confirmation
    if (session.state === 'duplicate_found') {
      const lowerMessage = message.toLowerCase().trim();

      if (['không trùng', 'khác', 'không', 'lưu', 'save'].some(keyword => lowerMessage.includes(keyword))) {
        // User confirmed it's not a duplicate, proceed to save
        session.state = 'awaiting_confirmation';
        sessions.set(sessionId, session);

        const { extracted } = session;
        const confirmMessage = `📝 Xác nhận thông tin:\n\n💰 Số tiền: ${extracted.amount.toLocaleString('vi-VN')} đ\n📁 Danh mục: ${extracted.category}\n📄 Mô tả: ${extracted.description}\n📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}\n\nLưu giao dịch này? (Có/Không/Sửa)`;

        return NextResponse.json({
          reply: confirmMessage,
          state: 'awaiting_confirmation'
        });
      } else if (['trùng', 'yes', 'có', 'đúng'].some(keyword => lowerMessage.includes(keyword))) {
        sessions.delete(sessionId);
        return NextResponse.json({
          reply: '✅ OK, tôi đã bỏ qua giao dịch trùng lặp này.',
          state: 'cancelled'
        });
      } else {
        return NextResponse.json({
          reply: 'Giao dịch này có trùng với giao dịch trước không? (Trùng/Không trùng)',
          state: 'duplicate_found'
        });
      }
    }

    // STEP 1: Extract expense information
    const extracted = await extractExpenseInfo(message);

    if (!extracted) {
      return NextResponse.json({
        reply: '❌ Xin lỗi, tôi không hiểu thông tin chi tiêu của bạn. Vui lòng nhập lại theo format:\n\nVí dụ: "Ăn tối 200k" hoặc "Grab về nhà 45000"',
        state: 'error'
      });
    }

    // Check confidence level
    if (extracted.confidence < 0.7) {
      return NextResponse.json({
        reply: `🤔 Tôi không chắc chắn về thông tin này. Bạn có thể nói rõ hơn được không?\n\nTôi hiểu:\n💰 Số tiền: ${extracted.amount.toLocaleString('vi-VN')} đ\n📁 Danh mục: ${extracted.category}\n📄 Mô tả: ${extracted.description}\n\nĐúng không?`,
        state: 'low_confidence'
      });
    }

    // STEP 2: Check for duplicates
    const duplicates = checkDuplicates(
      userId,
      extracted.amount,
      extracted.category,
      1 // Check last 1 day
    );

    if (duplicates && duplicates.length > 0) {
      // Found potential duplicates
      session = {
        state: 'duplicate_found',
        extracted,
        originalMessage: message,
        duplicates
      };
      sessions.set(sessionId, session);

      const dupList = duplicates.map((d, idx) =>
        `${idx + 1}. ${d.description} - ${d.amount.toLocaleString('vi-VN')} đ (${new Date(d.transaction_date).toLocaleDateString('vi-VN')})`
      ).join('\n');

      return NextResponse.json({
        reply: `⚠️ Phát hiện giao dịch tương tự:\n\n${dupList}\n\nĐây có phải giao dịch trùng không? (Trùng/Không trùng)`,
        state: 'duplicate_found'
      });
    }

    // STEP 3: Confirmation
    session = {
      state: 'awaiting_confirmation',
      extracted,
      originalMessage: message
    };
    sessions.set(sessionId, session);

    const confirmMessage = `📝 Xác nhận thông tin:\n\n💰 Số tiền: ${extracted.amount.toLocaleString('vi-VN')} đ\n📁 Danh mục: ${extracted.category}\n📄 Mô tả: ${extracted.description}\n📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}\n\nLưu giao dịch này? (Có/Không/Sửa)`;

    const response = NextResponse.json({
      reply: confirmMessage,
      state: 'awaiting_confirmation'
    });

    // Set session cookie
    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      maxAge: 3600, // 1 hour
      sameSite: 'strict'
    });

    return response;

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

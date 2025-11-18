import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyStats, getTransactions } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // For demo purposes, using a fixed user ID
    const userId = 'demo-user';

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Default to current month
    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    // Get monthly statistics
    const stats = getMonthlyStats(userId, targetYear, targetMonth);

    if (!stats) {
      return NextResponse.json({
        report: {
          month: targetMonth,
          year: targetYear,
          total: 0,
          count: 0,
          average: 0,
          byCategory: [],
          topTransactions: [],
          weeklyTrend: []
        },
        summary: `📊 BÁO CÁO CHI TIÊU THÁNG ${targetMonth}/${targetYear}\n\n❌ Chưa có giao dịch nào trong tháng này.`
      });
    }

    const { total, count, average, byCategory, topTransactions } = stats;

    // Get previous month data for comparison
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

    const prevStats = getMonthlyStats(userId, prevYear, prevMonth);
    const prevTotal = prevStats?.total || 0;
    const changePercent = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0;

    // Weekly trend (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const weeklyTrend: { week: string; total: number }[] = [];

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(fourWeeksAgo);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekData = getTransactions(
        userId,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );

      const weekTotal = weekData.reduce((sum, t) => sum + t.amount, 0);
      weeklyTrend.push({
        week: `Tuần ${i + 1}`,
        total: weekTotal
      });
    }

    // Build summary text
    const categoryText = byCategory
      .map(c => `├─ ${c.category}: ${c.total.toLocaleString('vi-VN')} đ (${c.percentage}%)`)
      .join('\n');

    const topText = topTransactions
      .map((t, idx) => `${idx + 1}. ${t.description}: ${t.amount.toLocaleString('vi-VN')} đ (${new Date(t.transaction_date).toLocaleDateString('vi-VN')})`)
      .join('\n');

    const changeSymbol = changePercent > 0 ? '+' : '';
    const changeText = prevTotal > 0
      ? `└─ ${changeSymbol}${changePercent}% (${total.toLocaleString('vi-VN')} đ vs ${prevTotal.toLocaleString('vi-VN')} đ)`
      : '└─ Không có dữ liệu tháng trước để so sánh';

    const weeklyText = weeklyTrend
      .map(w => `${w.week}: ${w.total.toLocaleString('vi-VN')} đ`)
      .join('\n');

    const summary = `📊 BÁO CÁO CHI TIÊU THÁNG ${targetMonth}/${targetYear}

💰 TỔNG QUAN
├─ Tổng chi: ${total.toLocaleString('vi-VN')} đ
├─ Số giao dịch: ${count}
└─ Trung bình: ${Math.round(average).toLocaleString('vi-VN')} đ/giao dịch

📁 THEO DANH MỤC
${categoryText}

🏆 TOP 5 CHI TIÊU LỚN NHẤT
${topText}

📈 SO VỚI THÁNG TRƯỚC
${changeText}

📊 XU HƯỚNG 4 TUẦN GẦN ĐÂY
${weeklyText}`;

    return NextResponse.json({
      report: {
        month: targetMonth,
        year: targetYear,
        total,
        count,
        average,
        byCategory,
        topTransactions,
        changePercent,
        weeklyTrend
      },
      summary
    });

  } catch (error) {
    console.error('Report API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

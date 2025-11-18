import { GoogleGenerativeAI } from "@google/generative-ai";

// Server-side only - API key never exposed to client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const EXTRACTION_PROMPT = `Role: Bạn là AI trích xuất thông tin chi tiêu từ tiếng Việt tự nhiên.

Task: Phân tích và trả về JSON CHÍNH XÁC theo format:

{
  "amount": <số tiền VND, integer>,
  "category": "<1 trong 8 category>",
  "description": "<mô tả ngắn gọn 3-7 từ>",
  "confidence": <0.0-1.0>
}

Categories (BẮT BUỘC chọn 1):
1. "Ẩm thực" - ăn uống, cafe, nhà hàng
2. "Di chuyển" - xe, xăng, grab, taxi
3. "Mua sắm" - quần áo, đồ dùng, mỹ phẩm
4. "Giải trí" - phim, game, du lịch
5. "Sức khỏe" - thuốc, khám bệnh, gym
6. "Học tập" - sách, khóa học, văn phòng phẩm
7. "Hóa đơn" - điện, nước, internet, thuê nhà
8. "Khác" - không rõ ràng

Rules:
- Amount: Chuyển "k"=1000, "tr"=1000000. VD: "200k"→200000
- Description: Tóm tắt ngắn gọn, lowercase, không dấu câu
- Confidence:
  - 0.9-1.0: Rất rõ ràng
  - 0.7-0.9: Khá rõ
  - 0.5-0.7: Mơ hồ
  - <0.5: Không chắc chắn

Examples:
User: "đi ăn tối 200k"
→ {"amount":200000,"category":"Ẩm thực","description":"ăn tối","confidence":0.95}

User: "grab về nhà 45000"
→ {"amount":45000,"category":"Di chuyển","description":"grab về nhà","confidence":0.9}

User: "mua áo 350k"
→ {"amount":350000,"category":"Mua sắm","description":"mua áo","confidence":0.85}

User: "chi 100k"
→ {"amount":100000,"category":"Khác","description":"chi tiêu","confidence":0.5}

CRITICAL: Chỉ trả về JSON object duy nhất, KHÔNG có markdown, KHÔNG giải thích.`;

export interface ExtractedExpense {
  amount: number;
  category: string;
  description: string;
  confidence: number;
}

export async function extractExpenseInfo(userMessage: string): Promise<ExtractedExpense | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `${EXTRACTION_PROMPT}\n\nUser input: "${userMessage}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from response
    // Remove markdown code blocks if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(jsonText);

    // Validate the response
    if (
      typeof parsed.amount === 'number' &&
      typeof parsed.category === 'string' &&
      typeof parsed.description === 'string' &&
      typeof parsed.confidence === 'number'
    ) {
      return parsed as ExtractedExpense;
    }

    return null;
  } catch (error) {
    console.error('Gemini extraction error:', error);
    return null;
  }
}

// Check if message is asking for a report
export function isReportRequest(message: string): boolean {
  const reportKeywords = ['báo cáo', 'report', 'thống kê', 'tổng kết', 'tháng này', 'tháng trước'];
  const lowerMessage = message.toLowerCase();
  return reportKeywords.some(keyword => lowerMessage.includes(keyword));
}

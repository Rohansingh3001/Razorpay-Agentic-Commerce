import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { segmentId } = await request.json();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (segmentId === 'seg_1') {
      return NextResponse.json({
        success: true,
        data: {
          offer: '15% Off Next Purchase',
          reasoning: 'High intent users respond well to moderate discounts to overcome purchase hesitation.',
          predictedConversion: '8.5%',
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        offer: 'BOGO (Buy One Get One)',
        reasoning: 'Loyal deal seekers maximize cart size with BOGO offers.',
        predictedConversion: '12%',
      }
    });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

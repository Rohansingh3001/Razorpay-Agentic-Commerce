import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { segmentId, offer } = await request.json();

    await new Promise((resolve) => setTimeout(resolve, 800));

    let channel = 'Email';
    let time = '10:00 AM';

    if (segmentId === 'seg_1') {
      channel = 'WhatsApp';
      time = '06:30 PM';
    }

    return NextResponse.json({
      success: true,
      data: {
        channel,
        bestTime: time,
        content: `Hey! We miss you. Here is ${offer} just for you.`,
        urgency: 'Expires in 48 hours',
      }
    });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

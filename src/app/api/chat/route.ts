import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Create a temporary session ID based on IP or random if not present
    // For demo purposes, we can just use a static session ID for now, 
    // or let the client pass one. Let's just generate one if not present, 
    // but the python backend expects `messages` and `session_id`.
    
    // We will extract just the message history and pass it to the python backend.
    const messages = body.history.map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));
    
    const sessionId = body.sessionId || 'demo_session_1';

    // Add the latest user message
    messages.push({
      role: 'user',
      content: body.message
    });

    // Make the request to the Python backend
    const response = await fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        messages: messages
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend returned ${response.status}: ${errorText}`);
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    
    // The python backend returns:
    // { success: true, content: "response", audit_trail: [...], cart_id: "..." }
    
    // We just map `audit_trail` to the UI's `tool_calls` format directly
    let tool_calls = [];
    
    if (data.audit_trail) {
      for (const log of data.audit_trail) {
        // Construct a tool call object for the UI
        let uiToolCall = {
          name: log.tool,
          args: log.args,
          result: log.result
        };
        tool_calls.push(uiToolCall);
      }
    }

    const purchaseRequest = tool_calls.find((call: { name: string; result?: { purchase_request_id?: string } }) =>
      call.name === 'request_purchase' && call.result?.purchase_request_id
    );

    return NextResponse.json({ 
      success: true, 
      reply: data.content, 
      tool_calls,
      purchase_request_id: purchaseRequest?.result?.purchase_request_id || null,
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ success: false, reply: `ERR: ${error.message || 'BACKEND_CONNECTION_FAILED'}` }, { status: 500 });
  }
}

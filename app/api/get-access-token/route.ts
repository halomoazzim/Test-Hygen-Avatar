import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Get your HeyGen API key from environment variables
    const apiKey = process.env.HEYGEN_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'HEYGEN_API_KEY is not set in environment variables' },
        { status: 500 }
      );
    }

    // Make a request to HeyGen's token creation endpoint
    const response = await fetch('https://api.heygen.com/v1/session_token.create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        // You can add any additional parameters required by HeyGen's API
        expires_in: 3600 // Token valid for 1 hour
      })
    });

    // Check if the response is OK
    if (!response.ok) {
      let errorMessage = `HTTP error! Status: ${response.status}`;
      
      try {
        // Try to parse as JSON, but handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('Error from HeyGen API:', errorData);
          errorMessage = JSON.stringify(errorData);
        } else {
          // If not JSON, get the text response
          const errorText = await response.text();
          console.error('Error from HeyGen API (non-JSON):', errorText);
          errorMessage = errorText.substring(0, 200); // Limit the size of the error message
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
      }
      
      return NextResponse.json(
        { error: 'Failed to get session token from HeyGen API', details: errorMessage },
        { status: response.status }
      );
    }

    // Parse the successful response
    const data = await response.json();
    
    if (!data.data || !data.data.session_token) {
      console.error('Unexpected response format:', data);
      return NextResponse.json(
        { error: 'Invalid response format from HeyGen API', details: JSON.stringify(data) },
        { status: 500 }
      );
    }
    
    // Return the session token
    return new NextResponse(data.data.session_token);
  } catch (error) {
    console.error('Error generating session token:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate session token',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 
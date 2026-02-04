// Vercel Edge Function - Proxy for Google Apps Script
// Handles 302 redirects so ChatGPT Actions can work

export const config = {
  runtime: 'edge',
};

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxbERO4mYRA2V_ag6_a1kzzugj9J0i3fNoJ3m116e0n4IhP7OMGNOrTb0bag8cQTM0U/exec';

export default async function handler(request) {
  const { searchParams } = new URL(request.url);

  // Build query string for GAS
  const params = new URLSearchParams();
  for (const [key, value] of searchParams) {
    params.append(key, value);
  }

  const gasUrlWithParams = `${GAS_URL}?${params.toString()}`;

  try {
    // Fetch from GAS (automatically follows redirects)
    const response = await fetch(gasUrlWithParams, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: request.method === 'POST' ? await request.text() : undefined,
    });

    const data = await response.json();

    // Return clean response to ChatGPT
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

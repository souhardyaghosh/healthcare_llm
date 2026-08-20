const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Server responded with status HTTP ${response.status}`
      };
    }

    const data = await response.json();
    if (data && data.success && data.status === 'ok') {
      return {
        ok: true,
        data
      };
    }

    return {
      ok: false,
      error: 'Invalid response format from health endpoint'
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Network error or backend service unavailable'
    };
  }
}

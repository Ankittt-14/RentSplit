import { useState, useCallback } from "react";

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (apiCall) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      return result.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Something went wrong";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = () => setError(null);

  return { loading, error, execute, clearError };
}
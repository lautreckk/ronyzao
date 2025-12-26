import { useState, useCallback } from 'react';

// Defines the options for text generation
export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}

// Defines the callbacks for the hook
export interface UseTextGenerationCallbacks {
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
}

// Defines the return type of the hook
export interface UseTextGenerationResult {
  generateText: (prompt: string, options?: TextGenerationOptions) => Promise<string | null>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to generate text using the Newell AI model.
 */
export function useTextGeneration(callbacks?: UseTextGenerationCallbacks): UseTextGenerationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateText = useCallback(async (prompt: string, options?: TextGenerationOptions) => {
    setIsLoading(true);
    setError(null);

    const apiUrl = process.env.EXPO_PUBLIC_NEWELL_API_URL;
    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!apiUrl || !projectId) {
      const err = new Error('Missing configuration: EXPO_PUBLIC_NEWELL_API_URL or EXPO_PUBLIC_PROJECT_ID not set');
      console.error('[FastShot AI]', err);
      setError(err);
      callbacks?.onError?.(err);
      return null;
    }

    try {
      console.log('[FastShot AI] Sending request to:', apiUrl);

      // Attempting standard OpenAI-compatible endpoint
      // Previous attempt with /api/v1/generate failed with 404
      const response = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_API_KEY || ''}`, // Just in case, though user only mentioned Project ID
        },
        body: JSON.stringify({
          project_id: projectId, // Snake case might be safer for python backends
          projectId: projectId,  // Sending both to be safe
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        // If 404 again, we might try another fallback like /chat/completions or /generate in future
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      let resultText = '';
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        resultText = data.choices[0].message.content;
      } else if (data.choices && data.choices[0] && data.choices[0].text) {
        resultText = data.choices[0].text;
      } else if (typeof data.text === 'string') {
        resultText = data.text;
      } else if (data.generated_text) {
        resultText = data.generated_text;
      } else {
        console.warn('[FastShot AI] Unexpected response format:', data);
        resultText = JSON.stringify(data);
      }

      if (callbacks?.onSuccess) {
        callbacks.onSuccess(resultText);
      }

      return resultText;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.error('[FastShot AI] Request failed:', errorObj);
      setError(errorObj);

      if (callbacks?.onError) {
        callbacks.onError(errorObj);
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callbacks]);

  return {
    generateText,
    isLoading,
    error
  };
}

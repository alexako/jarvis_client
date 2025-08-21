import { useState, useRef, useCallback } from 'react';
import { JarvisAPI } from '../services/api';

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAudio = () => {
  const [audioStates, setAudioStates] = useState<Record<string, AudioState>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const updateAudioState = useCallback((messageId: string, updates: Partial<AudioState>) => {
    setAudioStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        ...updates
      }
    }));
  }, []);

  const playAudio = useCallback(async (messageId: string, streamUrl?: string, audioUrl?: string) => {
    if (!streamUrl && !audioUrl) return;

    try {
      updateAudioState(messageId, { isLoading: true, error: null });

      // Stop any currently playing audio for this message
      if (audioRefs.current[messageId]) {
        audioRefs.current[messageId].pause();
        audioRefs.current[messageId].currentTime = 0;
      }

      let audioBlob: Blob;

      if (streamUrl) {
        // Use streaming audio
        audioBlob = await JarvisAPI.streamAudio(streamUrl);
      } else if (audioUrl) {
        // Use regular audio file
        const fullUrl = audioUrl.startsWith('/') ? `${JarvisAPI.getApiInfo().baseUrl}${audioUrl}` : audioUrl;
        const response = await fetch(fullUrl);
        if (!response.ok) {
          throw new Error(`Failed to load audio: ${response.status}`);
        }
        audioBlob = await response.blob();
      } else {
        throw new Error('No audio URL provided');
      }

      // Create audio element and play
      const audioUrl_obj = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl_obj);
      audioRefs.current[messageId] = audio;

      audio.onplay = () => {
        updateAudioState(messageId, { isPlaying: true, isLoading: false });
      };

      audio.onended = () => {
        updateAudioState(messageId, { isPlaying: false });
        URL.revokeObjectURL(audioUrl_obj);
        delete audioRefs.current[messageId];
      };

      audio.onerror = () => {
        updateAudioState(messageId, { 
          isPlaying: false, 
          isLoading: false,
          error: 'Failed to play audio' 
        });
        URL.revokeObjectURL(audioUrl_obj);
        delete audioRefs.current[messageId];
      };

      await audio.play();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      updateAudioState(messageId, { 
        isPlaying: false, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Audio playback failed' 
      });
    }
  }, [updateAudioState]);

  const stopAudio = useCallback((messageId: string) => {
    if (audioRefs.current[messageId]) {
      audioRefs.current[messageId].pause();
      audioRefs.current[messageId].currentTime = 0;
      updateAudioState(messageId, { isPlaying: false });
    }
  }, [updateAudioState]);

  const getAudioState = useCallback((messageId: string): AudioState => {
    return audioStates[messageId] || { isPlaying: false, isLoading: false, error: null };
  }, [audioStates]);

  return {
    playAudio,
    stopAudio,
    getAudioState,
  };
};
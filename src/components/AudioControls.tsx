import React, { useState, useRef } from 'react';
import { Play, Pause, Loader, Volume2 } from 'lucide-react';
import { JarvisAPI } from '../services/api';
import { config } from '../config';

interface AudioControlsProps {
  messageId: string;
  streamUrl?: string;
  audioUrl?: string;
  className?: string;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  messageId,
  streamUrl,
  audioUrl,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasAudio = Boolean(streamUrl || audioUrl);
  
  if (!hasAudio) return null;

  const handlePlayPause = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      let audioBlob: Blob;

      if (streamUrl) {
        // Use streaming audio
        audioBlob = await JarvisAPI.streamAudio(streamUrl);
      } else if (audioUrl) {
        // Use regular audio file
        const fullUrl = audioUrl.startsWith('/') ? `${JarvisAPI.getApiInfo().baseUrl}${audioUrl}` : audioUrl;
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${config.api.apiKey}`,
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to load audio: ${response.status}`);
        }
        audioBlob = await response.blob();
      } else {
        throw new Error('No audio URL provided');
      }

      // Create audio element and play
      const audioUrlObject = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrlObject);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrlObject);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setIsLoading(false);
        setError('Failed to play audio');
        URL.revokeObjectURL(audioUrlObject);
        audioRef.current = null;
      };

      await audio.play();
      
    } catch (err) {
      console.error('Audio playback error:', err);
      setIsLoading(false);
      setIsPlaying(false);
      setError(err instanceof Error ? err.message : 'Audio playback failed');
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return <Loader size={16} className="animate-spin" />;
    }
    if (isPlaying) {
      return <Pause size={16} />;
    }
    return <Play size={16} />;
  };

  const getTooltip = () => {
    if (error) return error;
    if (isLoading) return 'Loading audio...';
    if (isPlaying) return 'Pause audio';
    return streamUrl ? 'Play streaming audio' : 'Play audio';
  };

  return (
    <div className={`audio-controls ${className}`}>
      <button
        className={`audio-controls__button ${isPlaying ? 'audio-controls__button--playing' : ''} ${error ? 'audio-controls__button--error' : ''}`}
        onClick={handlePlayPause}
        disabled={isLoading}
        title={getTooltip()}
      >
        <Volume2 size={12} className="audio-controls__icon" />
        {getButtonContent()}
      </button>
      
      {error && (
        <span className="audio-controls__error">{error}</span>
      )}
      
      {streamUrl && (
        <span className="audio-controls__badge">streaming</span>
      )}
    </div>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { JarvisAPI } from '../services/api';
import { AIProvider } from '../types';

interface LiveChatProps {
  selectedProvider: AIProvider;
  onCallEnd?: () => void;
}

type CallState = 'idle' | 'calling' | 'connected' | 'ended';

export const LiveChat: React.FC<LiveChatProps> = ({ 
  selectedProvider,
  onCallEnd 
}) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const callTimerRef = useRef<NodeJS.Timeout>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Format call duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start call timer
  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop call timer
  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = undefined;
    }
  };

  // Initialize call
  const initializeCall = async () => {
    if (callState !== 'idle') return;

    try {
      setCallState('calling');
      setIsConnecting(true);
      setCallDuration(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      audioStreamRef.current = stream;

      // Setup media recorder for future audio streaming
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      // Check API health before connecting
      try {
        const health = await JarvisAPI.checkHealth();
        const providerHealth = health.find(h => h.provider === selectedProvider);
        
        if (providerHealth && providerHealth.status === 'offline') {
          console.warn(`⚠️ ${selectedProvider} provider appears offline, but attempting connection anyway`);
        }
      } catch (healthError) {
        console.warn('⚠️ Health check failed, but proceeding with call attempt:', healthError);
        // Continue anyway - health check failure doesn't mean the API is down
      }

      // Simulate realistic connection delay (ringing state)
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      // Check if call was cancelled during connection
      if (callState === 'calling') {
        setCallState('connected');
        setIsConnecting(false);
        startCallTimer();

        // Send initial greeting through API
        try {
          await JarvisAPI.sendMessage(
            "Hello Jarvis, I'm starting a live chat session.", 
            selectedProvider, 
            true, // use TTS
            true  // stream audio
          );
        } catch (apiError) {
          console.warn('Failed to send initial greeting:', apiError);
          // Continue with call even if greeting fails
        }
      }

    } catch (error) {
      console.error('Failed to initialize call:', error);
      setCallState('idle');
      setIsConnecting(false);
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access was denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone found. Please check your audio devices and try again.');
        } else if (error.message.includes('provider is not available')) {
          alert(`Could not connect to ${selectedProvider}. Please check the server status and try again.`);
        } else {
          alert('Could not initialize call. Please check your connection and try again.');
        }
      }
    }
  };

  // End call
  const endCall = () => {
    setCallState('ended');
    stopCallTimer();
    
    // Stop media streams
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Reset state after a short delay
    setTimeout(() => {
      setCallState('idle');
      setCallDuration(0);
      setIsMuted(false);
      setIsSpeakerOn(true);
      onCallEnd?.();
    }, 1000);
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioStreamRef.current) {
      const audioTracks = audioStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // In a real implementation, this would control audio output routing
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallTimer();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Render different states
  const renderCallButton = () => (
    <div className="live-chat__call-button-container">
      <button
        className="live-chat__call-button"
        onClick={initializeCall}
        disabled={isConnecting}
      >
        <Phone size={24} />
        <span>Call Jarvis</span>
      </button>
    </div>
  );

  const renderCallingState = () => (
    <div className="live-chat__calling">
      <div className="live-chat__avatar">
        <div className="live-chat__avatar-image">
          🤖
        </div>
        <div className="live-chat__calling-animation">
          <div className="live-chat__ring"></div>
          <div className="live-chat__ring"></div>
          <div className="live-chat__ring"></div>
        </div>
      </div>
      <h2 className="live-chat__calling-text">Calling Jarvis...</h2>
      <p className="live-chat__calling-subtitle">Connecting to AI assistant</p>
      
      <div className="live-chat__calling-controls">
        <button 
          className="live-chat__control-button live-chat__control-button--end"
          onClick={endCall}
        >
          <PhoneOff size={24} />
        </button>
      </div>
    </div>
  );

  const renderConnectedState = () => (
    <div className="live-chat__connected">
      <div className="live-chat__header">
        <div className="live-chat__avatar">
          <div className="live-chat__avatar-image live-chat__avatar-image--connected">
            🤖
          </div>
          <div className="live-chat__status-indicator"></div>
        </div>
        <div className="live-chat__call-info">
          <h2>Jarvis AI</h2>
          <p className="live-chat__duration">{formatDuration(callDuration)}</p>
        </div>
      </div>

      <div className="live-chat__content">
        <div className="live-chat__visualizer">
          {/* Audio visualizer could go here */}
          <div className="live-chat__waveform">
            <div className="live-chat__wave"></div>
            <div className="live-chat__wave"></div>
            <div className="live-chat__wave"></div>
            <div className="live-chat__wave"></div>
            <div className="live-chat__wave"></div>
          </div>
        </div>
      </div>

      <div className="live-chat__controls">
        <button 
          className={`live-chat__control-button ${isMuted ? 'live-chat__control-button--active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <button 
          className="live-chat__control-button live-chat__control-button--end"
          onClick={endCall}
          title="End call"
        >
          <PhoneOff size={24} />
        </button>

        <button 
          className={`live-chat__control-button ${!isSpeakerOn ? 'live-chat__control-button--active' : ''}`}
          onClick={toggleSpeaker}
          title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
        >
          {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </div>
    </div>
  );

  const renderEndedState = () => (
    <div className="live-chat__ended">
      <div className="live-chat__avatar">
        <div className="live-chat__avatar-image live-chat__avatar-image--ended">
          🤖
        </div>
      </div>
      <h2>Call Ended</h2>
      <p>Duration: {formatDuration(callDuration)}</p>
    </div>
  );

  return (
    <div className="live-chat">
      {callState === 'idle' && renderCallButton()}
      {callState === 'calling' && renderCallingState()}
      {callState === 'connected' && renderConnectedState()}
      {callState === 'ended' && renderEndedState()}
    </div>
  );
};
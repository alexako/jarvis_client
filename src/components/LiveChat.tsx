import React, { useState, useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { JarvisAPI } from '../services/api';
import { AIProvider } from '../types';

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

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
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [sttSupported, setSttSupported] = useState(false);
  
  const callTimerRef = useRef<NodeJS.Timeout>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout>();
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Format call duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check STT support on component mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSttSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      console.log('🎤 Web Speech API supported');
    } else {
      console.warn('🚫 Web Speech API not supported - will use fallback');
    }
  }, []);

  // Initialize Speech Recognition
  const initializeSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);
      
      // Restart if still connected and not muted
      if (callState === 'connected' && !isMuted) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.warn('Failed to restart speech recognition:', error);
          }
        }, 100);
      }
    };

    recognition.onerror = (event) => {
      console.error('🎤 Speech recognition error:', event.error);
      setIsListening(false);
      
      // Handle specific errors
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please enable microphone permissions.');
      }
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setLiveTranscript(interimTranscript);
      
      if (finalTranscript) {
        console.log('🎤 Final transcript:', finalTranscript);
        setFinalTranscript(prev => prev + finalTranscript);
        setLiveTranscript('');
        
        // Auto-send after a pause
        handleSpeechComplete(finalTranscript.trim());
      }
    };

    return recognition;
  };

  // Handle completed speech
  const handleSpeechComplete = (transcript: string) => {
    if (!transcript || transcript.length < 2) return;
    
    // Clear any existing silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Set a timer to send the message after a pause
    silenceTimerRef.current = setTimeout(() => {
      sendTranscriptToJarvis(transcript);
    }, 1500); // 1.5 second pause before sending
  };

  // Create and play ringing sound
  const playRingingSound = () => {
    // Create a simple ringing tone using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Ring tone frequencies (similar to traditional phone ring)
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    oscillator.frequency.setValueAtTime(480, audioContext.currentTime + 0.5); // A4#
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    // Create repeating ring pattern
    const ringDuration = 1.5; // 1.5 seconds ring
    const pauseDuration = 0.5; // 0.5 seconds pause
    
    oscillator.start();
    
    // Stop after a reasonable time or when call connects
    setTimeout(() => {
      try {
        oscillator.stop();
        audioContext.close();
      } catch (error) {
        console.warn('Error stopping ringing sound:', error);
      }
    }, 8000); // Stop after 8 seconds max
    
    return { oscillator, audioContext };
  };

  // Stop ringing sound
  const stopRingingSound = () => {
    if (ringingAudioRef.current) {
      try {
        ringingAudioRef.current.pause();
        ringingAudioRef.current = null;
      } catch (error) {
        console.warn('Error stopping ringing sound:', error);
      }
    }
  };

  // Send transcript to Jarvis
  const sendTranscriptToJarvis = async (transcript: string) => {
    if (!transcript.trim()) return;
    
    console.log('📤 Sending to Jarvis:', transcript);
    setFinalTranscript(''); // Clear the transcript display
    
    try {
      // Stop listening while Jarvis is responding
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      const response = await JarvisAPI.sendMessage(
        transcript,
        selectedProvider,
        true, // use TTS
        true  // stream audio
      );
      
      console.log('✅ Jarvis responded:', response.response);
      
      // Resume listening after a short delay to allow TTS to start
      setTimeout(() => {
        if (callState === 'connected' && !isMuted && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.warn('Failed to restart speech recognition after response:', error);
          }
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Failed to send message to Jarvis:', error);
      
      // Resume listening even if there was an error
      setTimeout(() => {
        if (callState === 'connected' && !isMuted && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (error) {
            console.warn('Failed to restart speech recognition after error:', error);
          }
        }
      }, 1000);
    }
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

      // Start ringing sound
      const ringingSound = playRingingSound();
      console.log('📞 Playing ringing sound...');

      // Simulate realistic connection delay (ringing state)
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      // Stop ringing sound when connection is established
      if (ringingSound) {
        try {
          ringingSound.oscillator.stop();
          ringingSound.audioContext.close();
        } catch (error) {
          console.warn('Error stopping ringing sound:', error);
        }
      }

      // Transition to connected state
      setCallState('connected');
      setIsConnecting(false);
      startCallTimer();

      // Initialize Speech Recognition if supported
      if (sttSupported) {
        recognitionRef.current = initializeSpeechRecognition();
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            console.log('🎤 Starting speech recognition for live chat');
          } catch (error) {
            console.warn('Failed to start speech recognition:', error);
          }
        }
      }

      // Send initial greeting through API to get Jarvis response
      try {
        const response = await JarvisAPI.sendMessage(
          "Hello Jarvis, I've just connected to you via live chat. Please greet me in your typical Jarvis style.", 
          selectedProvider, 
          true, // use TTS
          true  // stream audio
        );
        
        // If we get an audio response, play it automatically
        if (response.audioUrl || response.streamUrl) {
          console.log('🎵 Playing Jarvis greeting audio');
          // You could integrate with the existing audio system here
          // For now, just log that we received the greeting
        }
      } catch (apiError) {
        console.warn('Failed to send initial greeting:', apiError);
        // Continue with call even if greeting fails
      }

    } catch (error) {
      console.error('Failed to initialize call:', error);
      setCallState('idle');
      setIsConnecting(false);
      stopRingingSound(); // Stop ringing on error
      
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
    stopRingingSound(); // Stop ringing if still playing
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Clear any pending timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
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
      setIsListening(false);
      setLiveTranscript('');
      setFinalTranscript('');
      onCallEnd?.();
    }, 1000);
  };

  // Toggle mute
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Handle microphone muting
    if (audioStreamRef.current) {
      const audioTracks = audioStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
    }
    
    // Handle speech recognition
    if (recognitionRef.current) {
      if (newMutedState) {
        // Stop listening when muted
        recognitionRef.current.stop();
        console.log('🔇 Speech recognition stopped (muted)');
      } else {
        // Resume listening when unmuted
        try {
          recognitionRef.current.start();
          console.log('🎤 Speech recognition resumed (unmuted)');
        } catch (error) {
          console.warn('Failed to restart speech recognition after unmute:', error);
        }
      }
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
      stopRingingSound();
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
        <div className="live-chat__conversation">
          {/* Live transcription area */}
          <div className="live-chat__transcription">
            {(liveTranscript || finalTranscript) && (
              <div className="live-chat__transcript-container">
                {finalTranscript && (
                  <div className="live-chat__final-transcript">
                    <span className="live-chat__speaker">You:</span> {finalTranscript}
                  </div>
                )}
                {liveTranscript && (
                  <div className="live-chat__live-transcript">
                    <span className="live-chat__speaker">You:</span> {liveTranscript}
                    <span className="live-chat__cursor">|</span>
                  </div>
                )}
              </div>
            )}
            
            {!sttSupported && (
              <div className="live-chat__stt-fallback">
                <p>🎤 Voice recognition not supported in this browser</p>
                <p>Use Chrome or Safari for the best experience</p>
              </div>
            )}
          </div>
          
          {/* Audio visualizer */}
          <div className="live-chat__visualizer">
            <div className="live-chat__waveform">
              <div className={`live-chat__wave ${isListening ? 'live-chat__wave--active' : ''}`}></div>
              <div className={`live-chat__wave ${isListening ? 'live-chat__wave--active' : ''}`}></div>
              <div className={`live-chat__wave ${isListening ? 'live-chat__wave--active' : ''}`}></div>
              <div className={`live-chat__wave ${isListening ? 'live-chat__wave--active' : ''}`}></div>
              <div className={`live-chat__wave ${isListening ? 'live-chat__wave--active' : ''}`}></div>
            </div>
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

  // Debug logging for state changes
  if (selectedProvider && console.log) {
    console.log(`🔗 LiveChat state: ${callState}, connecting: ${isConnecting}, provider: ${selectedProvider}`);
  }

  return (
    <div className="live-chat">
      {callState === 'idle' && renderCallButton()}
      {callState === 'calling' && renderCallingState()}
      {callState === 'connected' && renderConnectedState()}
      {callState === 'ended' && renderEndedState()}
    </div>
  );
};
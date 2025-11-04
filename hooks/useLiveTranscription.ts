
import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';

// Helper to encode raw audio data
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to create a Blob for the API
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] < 0 ? data[i] * 32768 : data[i] * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const useLiveTranscription = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentTranscriptRef = useRef<string>('');

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    setIsRecording(false);
    
    sessionPromiseRef.current?.then(session => session.close());
    sessionPromiseRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    audioContextRef.current?.close();

    setTranscript(currentTranscriptRef.current);
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;
    
    currentTranscriptRef.current = '';
    setTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session opened.');
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                currentTranscriptRef.current += text;
              }
            }
             if (message.serverContent?.turnComplete) {
                // To provide a smoother UX, we can update the live transcript here
                // but for this app, we'll just aggregate and set it on stop.
             }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error:', e);
            stopRecording();
          },
          onclose: () => {
            console.log('Live session closed.');
            // Stop mic access
            stream.getTracks().forEach(track => track.stop());
          },
        },
        config: {
          inputAudioTranscription: {},
        },
      });

    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
    }
  }, [isRecording, stopRecording]);

  return { isRecording, transcript, startRecording, stopRecording };
};

export default useLiveTranscription;

import React, { useState, useRef, useEffect } from "react";
import { Square, Trash2, Send, Volume2 } from "lucide-react";
import styless from "./VoiceRecorder.module.scss";

interface VoiceRecorderProps {
  onRecordingComplete: (file: File) => void;
  onCancel: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Auto-start recording when component mounts
    startRecording();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Mikrofonga ruxsat berilmagan");
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingTime(0);
    onCancel();
  };

  const sendRecording = () => {
    if (audioBlob) {
      const fileName = `voice_${Date.now()}.webm`;
      const file = new File([audioBlob], fileName, { type: "audio/webm" });
      // Send the file immediately without waiting for attachment
      onRecordingComplete(file);
      // Don't call cancelRecording here, let the parent handle cleanup
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styless.voice_recorder}>
      {!audioUrl ? (
        <div className={styless.recording_container}>
          <div className={styless.recording_indicator}>
            <span className={styless.recording_dot} />
            <span className={styless.recording_time}>
              {formatTime(recordingTime)}
            </span>
          </div>
          <button
            className={styless.stop_btn}
            onClick={stopRecording}
            title="To'xtatish"
          >
            <Square size={16} />
          </button>
          <button
            className={styless.cancel_recording_btn}
            onClick={cancelRecording}
            title="Bekor qilish"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className={styless.preview_container}>
          <div className={styless.audio_preview}>
            <Volume2 size={16} />
            <audio controls autoPlay className={styless.audio_player}>
              <source src={audioUrl} type="audio/webm" />
            </audio>
            <span className={styless.audio_duration}>
              {formatTime(recordingTime)}
            </span>
          </div>
          <div className={styless.preview_actions}>
            <button
              className={styless.cancel_btn}
              onClick={cancelRecording}
              title="Bekor qilish"
            >
              <Trash2 size={16} />
            </button>
            <button
              className={styless.send_btn}
              onClick={sendRecording}
              title="Yuborish"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
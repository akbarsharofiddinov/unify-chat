import React, { useState, useRef, useEffect } from "react";
import { Square, Trash2, Send, Volume2, Mic, AlertCircle } from "lucide-react";
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
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isPermissionChecking, setIsPermissionChecking] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check and request microphone permission
  const checkMicrophonePermission = async (): Promise<boolean> => {
    try {
      // First check if mediaDevices API is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError("Brauzeringiz mikrofonga ruxsat berishni qo'llab-quvvatlamaydi");
        setIsPermissionChecking(false);
        return false;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Close the stream immediately if we're just checking permission
      // We'll open a new one when actually recording
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      setPermissionError(null);
      setIsPermissionChecking(false);
      return true;
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError("Mikrofonga ruxsat berilmagan. Iltimos, brauzer sozlamalaridan ruxsat bering.");
      } else if (error.name === 'NotFoundError') {
        setPermissionError("Mikrofon topilmadi. Iltimos, mikrofoningizni ulang.");
      } else if (error.name === 'NotReadableError') {
        setPermissionError("Mikrofonga ulanishda xatolik. Iltimos, boshqa dasturlar mikrofondan foydalanmayotganini tekshiring.");
      } else {
        setPermissionError("Mikrofonga ulanishda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
      
      setIsPermissionChecking(false);
      return false;
    }
  };

  // Start actual recording
  const startRecording = async () => {
    setPermissionError(null);
    
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
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100); // Collect data in 100ms chunks
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error: any) {
      console.error("Start recording error:", error);
      if (error.name === 'NotAllowedError') {
        setPermissionError("Mikrofonga ruxsat berilmagan. Iltimos, brauzer sozlamalaridan ruxsat bering.");
      } else {
        setPermissionError("Yozishni boshlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      }
    }
  };

  // Auto-start recording when component mounts and permission is granted
  useEffect(() => {
    const initRecording = async () => {
      const hasPermission = await checkMicrophonePermission();
      if (hasPermission) {
        await startRecording();
      }
    };
    
    initRecording();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

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
      onRecordingComplete(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Show permission error
  if (permissionError) {
    return (
      <div className={styless.voice_recorder_error}>
        <div className={styless.error_content}>
          <AlertCircle size={24} className={styless.error_icon} />
          <p className={styless.error_message}>{permissionError}</p>
          <div className={styless.error_actions}>
            <button 
              className={styless.error_cancel_btn}
              onClick={onCancel}
            >
              Bekor qilish
            </button>
            <button 
              className={styless.error_retry_btn}
              onClick={() => {
                setPermissionError(null);
                setIsPermissionChecking(true);
                checkMicrophonePermission().then(hasPermission => {
                  if (hasPermission) startRecording();
                });
              }}
            >
              Qayta urinish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show checking permission state
  if (isPermissionChecking) {
    return (
      <div className={styless.voice_recorder_checking}>
        <div className={styless.checking_content}>
          <Mic size={24} className={styless.checking_icon} />
          <p>Mikrofonga ruxsat so'ralmoqda...</p>
        </div>
      </div>
    );
  }

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
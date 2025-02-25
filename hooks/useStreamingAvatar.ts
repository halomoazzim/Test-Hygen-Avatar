import { useCallback, useEffect, useRef, useState } from "react";
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskMode, TaskType, VoiceEmotion } from "@heygen/streaming-avatar";

interface UseStreamingAvatarProps {
  containerRef: React.RefObject<HTMLDivElement>;
  avatarId?: string;
}

interface SpeakOptions {
  text: string;
  task_type?: TaskType;
  task_mode?: TaskMode;
}

export function useStreamingAvatar({ containerRef, avatarId = "avatar_f_monica_001" }: UseStreamingAvatarProps) {
  const [isStarted, setIsStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const avatarRef = useRef<StreamingAvatar | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchAccessToken = async () => {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return "";
    }
  };

  const start = useCallback(async () => {
    if (isStarted || isLoading) return;
    
    setIsLoading(true);
    try {
      const token = await fetchAccessToken();
      if (!token) {
        throw new Error("Failed to get access token");
      }

      // Initialize avatar with the correct syntax
      avatarRef.current = new StreamingAvatar({ token });

      // Set up event listeners
      avatarRef.current.on(StreamingEvents.STREAM_READY, (event: any) => {
        streamRef.current = event.detail;
        
        // Create video element if it doesn't exist
        if (!videoRef.current && containerRef.current) {
          const video = document.createElement("video");
          video.autoplay = true;
          video.playsInline = true;
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.objectFit = "contain";
          
          containerRef.current.appendChild(video);
          videoRef.current = video;
        }
        
        // Set stream to video element
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
          };
        }
      });

      // Start avatar session
      await avatarRef.current.createStartAvatar({
        quality: AvatarQuality.Medium,
        avatarName: avatarId,
        voice: {
          rate: 1.2,
          emotion: VoiceEmotion.NEUTRAL,
        },
        disableIdleTimeout: true,
      });

      setIsStarted(true);
    } catch (error) {
      console.error("Error starting avatar:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [avatarId, containerRef, isLoading, isStarted]);

  const speak = useCallback(async ({ text, task_type = TaskType.REPEAT, task_mode = TaskMode.SYNC }: SpeakOptions) => {
    if (!avatarRef.current || !isStarted) {
      console.error("Avatar not started");
      return;
    }

    try {
      await avatarRef.current.speak({
        text,
        taskType: task_type,
        taskMode: task_mode,
      });
    } catch (error) {
      console.error("Error making avatar speak:", error);
      throw error;
    }
  }, [isStarted]);

  const stop = useCallback(async () => {
    if (!avatarRef.current || !isStarted) return;

    try {
      await avatarRef.current.stopAvatar();
      
      // Clean up video element
      if (videoRef.current && containerRef.current) {
        containerRef.current.removeChild(videoRef.current);
        videoRef.current = null;
      }
      
      streamRef.current = null;
      avatarRef.current = null;
      setIsStarted(false);
    } catch (error) {
      console.error("Error stopping avatar:", error);
      throw error;
    }
  }, [containerRef, isStarted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (avatarRef.current && isStarted) {
        avatarRef.current.stopAvatar().catch(console.error);
      }
      
      if (videoRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(videoRef.current);
        } catch (error) {
          console.error("Error removing video element:", error);
        }
      }
    };
  }, [containerRef, isStarted]);

  return {
    isStarted,
    isLoading,
    start,
    speak,
    stop,
  };
} 
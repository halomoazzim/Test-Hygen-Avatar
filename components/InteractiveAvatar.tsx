import type { StartAvatarResponse } from "@heygen/streaming-avatar";
import StreamingAvatar, { AvatarQuality, StreamingEvents, TaskMode, TaskType, VoiceEmotion } from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import { useStreamingAvatar } from "../hooks/useStreamingAvatar";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";

import * as HeyGenModule from "@heygen/streaming-avatar";
console.log("HeyGen Module:", HeyGenModule);

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>("");
  const [knowledgeId, setKnowledgeId] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>("");
  const [language, setLanguage] = useState<string>('en');

  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { start, speak, stop, isStarted } = useStreamingAvatar({
    containerRef,
    avatarId: avatarId || "avatar_f_monica_001",
  });

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
      }
      
      const token = await response.text();
      console.log("Access Token:", token); // Log the token to verify
      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error; // Re-throw to handle in the calling function
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    try {
      const newToken = await fetchAccessToken();
      if (!newToken) {
        throw new Error("Failed to get access token");
      }

      console.log("StreamingAvatar:", HeyGenModule.StreamingAvatar);
      console.log("Default export:", HeyGenModule.default);
      
      avatar.current = new HeyGenModule.default({ token: newToken });
      
      avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      
      avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      
      avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
        endSession();
      });
      
      avatar.current.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
        setStream(event.detail);
      });
      
      avatar.current.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event);
        setIsUserTalking(true);
      });
      
      avatar.current.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event);
        setIsUserTalking(false);
      });
      
      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.Low,
        avatarName: avatarId || "avatar_f_monica_001",
        knowledgeId: knowledgeId,
        voice: {
          rate: 1.5,
          emotion: VoiceEmotion.EXCITED,
        },
        language: language,
        disableIdleTimeout: true,
      });

      setData(res);
      
      await avatar.current.startVoiceChat({
        useSilencePrompt: false
      });
      
      setChatMode("voice_mode");
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoadingSession(false);
    }
  }
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current.speak({ text: text, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC }).catch((e) => {
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
  }

  const handleChangeChatMode = useMemoizedFn(async (v: any) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      await start();
      await speak({
        text: "Hello, I'm Monica. How can I help you today?",
        task_type: TaskType.REPEAT,
      });
    } catch (error) {
      console.error("Error starting avatar:", error);
      if (error instanceof Error) {
        setDebug(error.message);
      } else {
        setDebug(String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      await stop();
    } catch (error) {
      console.error("Error stopping avatar:", error);
      if (error instanceof Error) {
        setDebug(error.message);
      } else {
        setDebug(String(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Use the API route to get the response
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: text }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }
      
      // Make the avatar speak the generated response
      if (avatar.current) {
        await avatar.current.speak({
          text: data.response,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.SYNC
        });
      } else {
        console.error("Avatar not initialized");
      }
      
      setText("");
    } catch (error) {
      console.error("Error processing query:", error);
      if (error instanceof Error) {
        setDebug(error.message);
      } else {
        setDebug(String(error));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full">
        <CardBody className="flex flex-col gap-4">
          {!isLoadingSession ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Select
                  label="Avatar"
                  placeholder="Select an avatar"
                  className="w-full"
                  onChange={(e) => {
                    setAvatarId(e.target.value);
                  }}
                >
                  {AVATARS.map((avatar) => (
                    <SelectItem 
                      key={avatar.avatar_id} 
                      value={avatar.avatar_id}
                      textValue={avatar.name}
                    >
                      {avatar.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  label="Language"
                  placeholder="Select a language"
                  className="w-full"
                  onChange={(e) => {
                    setLanguage(e.target.value);
                  }}
                  defaultSelectedKeys={["en"]}
                >
                  {STT_LANGUAGE_LIST.map((lang) => (
                    <SelectItem 
                      key={lang.key} 
                      value={lang.value}
                      textValue={lang.label}
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <Input
                label="Knowledge ID"
                placeholder="Enter knowledge ID"
                value={knowledgeId}
                onChange={(e) => setKnowledgeId(e.target.value)}
              />
            </div>
          ) : (
            <Spinner color="default" size="lg" />
          )}
          <div className="flex gap-4">
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
              isLoading={isLoadingSession}
              onClick={startSession}
            >
              Start Session
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
              isLoading={isLoadingRepeat}
              onClick={handleSpeak}
              isDisabled={!stream}
            >
              Speak
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
              onClick={handleInterrupt}
              isDisabled={!stream}
            >
              Interrupt
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
              onClick={endSession}
              isDisabled={!stream}
            >
              End Session
            </Button>
          </div>
          <div className="flex gap-4">
            <Button
              className="bg-gradient-to-tr from-blue-500 to-cyan-500 text-white shadow-lg"
              isLoading={isLoading}
              onClick={handleStart}
              isDisabled={isStarted}
            >
              Start Avatar
            </Button>
            <Button
              className="bg-gradient-to-tr from-red-500 to-orange-500 text-white shadow-lg"
              isLoading={isLoading}
              onClick={handleStop}
              isDisabled={!isStarted}
            >
              Stop Avatar
            </Button>
          </div>
          <div className="w-full h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            {stream ? (
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div ref={containerRef} className="w-full h-full flex items-center justify-center">
                {isLoading ? (
                  <Spinner size="lg" color="primary" />
                ) : (
                  <p className="text-gray-500">Start a session to see the avatar</p>
                )}
              </div>
            )}
          </div>
        </CardBody>
        <Divider />
        <CardFooter className="flex flex-col gap-3 relative">
          <Tabs
            aria-label="Options"
            selectedKey={chatMode}
            onSelectionChange={(v) => {
              if (typeof v === 'string') {
                handleChangeChatMode(v);
              }
            }}
          >
            <Tab key="text_mode" title="Text mode" />
            <Tab key="voice_mode" title="Voice mode" />
          </Tabs>
          {chatMode === "text_mode" ? (
            <div className="w-full flex relative">
              <InteractiveAvatarTextInput
                disabled={!stream}
                input={text}
                label="Chat"
                loading={isLoadingRepeat}
                placeholder="Type something for the avatar to respond"
                setInput={setText}
                onSubmit={handleSubmit}
              />
              {text && (
                <Chip className="absolute right-16 top-3">Listening</Chip>
              )}
            </div>
          ) : (
            <div className="w-full text-center">
              <Button
                isDisabled={!isUserTalking}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white"
                size="md"
                variant="shadow"
              >
                {isUserTalking ? "Listening" : "Voice chat"}
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      <p className="font-mono text-right">
        <span className="font-bold">Console:</span>
        <br />
        {typeof debug === 'string' ? debug : JSON.stringify(debug)}
      </p>
    </div>
  );
}

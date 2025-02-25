"use client";

import React from "react";
import { Link } from "@nextui-org/react";
import { GithubIcon, HeyGenLogo } from "./Icons";
import { ThemeSwitch } from "./ThemeSwitch";

export default function Navbar() {
  return (
    <header className="w-full py-2 px-4 flex items-center justify-between border-b">
      {/* Logo and Title */}
      <div className="flex items-center">
        <Link href="https://app.heygen.com/" isExternal className="flex items-center">
          <HeyGenLogo />
          <span className="ml-4 text-xl font-semibold bg-gradient-to-br from-sky-300 to-indigo-500 bg-clip-text text-transparent">
            HeyGen Interactive Avatar SDK NextJS Demo
          </span>
        </Link>
      </div>
      
      {/* Center Links */}
      <div className="hidden md:flex items-center space-x-6">
        <Link href="https://labs.heygen.com/interactive-avatar" isExternal>
          Avatars
        </Link>
        <Link href="https://docs.heygen.com/reference/list-voices-v2" isExternal>
          Voices
        </Link>
        <Link href="https://docs.heygen.com/reference/new-session-copy" isExternal>
          API Docs
        </Link>
        <Link href="https://help.heygen.com/en/articles/9182113-interactive-avatar-101-your-ultimate-guide" isExternal>
          Guide
        </Link>
        <Link href="https://github.com/HeyGen-Official/StreamingAvatarSDK" isExternal className="flex items-center">
          <GithubIcon className="text-default-500 mr-1" />
          <span>SDK</span>
        </Link>
      </div>
      
      {/* Right Side */}
      <div className="flex items-center space-x-4">
        <ThemeSwitch />
        <Link 
          href="https://docs.heygen.com/docs/streaming-avatar-sdk-reference"
          isExternal
          className="bg-primary text-white px-4 py-2 rounded-md"
        >
          Documentation
        </Link>
      </div>
    </header>
  );
}

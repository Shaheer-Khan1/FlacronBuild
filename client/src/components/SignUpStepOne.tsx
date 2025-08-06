
'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SignUpStepOneProps {
  fullName: string;
  setFullName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  error: string | null;
  loading: boolean;
  handleEmailAuth: (e: React.FormEvent) => void;
}

export default function SignUpStepOne({
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  loading,
  handleEmailAuth,
}: SignUpStepOneProps) {
  return (
    <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          Full Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          Email <span className="text-red-500">*</span>
        </label>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          Password <span className="text-red-500">*</span>
        </label>
        <Input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <Input
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className="text-red-500 text-sm text-center">{error}</div>}
      <Button type="submit" disabled={loading || !fullName || !email || !password || !confirmPassword}>
        Continue
      </Button>
    </form>
  );
}

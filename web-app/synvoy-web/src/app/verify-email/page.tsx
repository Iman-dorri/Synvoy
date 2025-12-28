'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

interface VerificationStatus {
  email: string;
  is_verified: boolean;
  code_expires_at: string | null;
  account_deletion_at: string | null;
  time_remaining_seconds: number | null;
  deletion_time_remaining_seconds: number | null;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refreshProfile } = useAuth();
  
  const email = searchParams.get('email') || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [codeExpired, setCodeExpired] = useState(false);
  const [accountDeletionTime, setAccountDeletionTime] = useState<number | null>(null);
  const [canResend, setCanResend] = useState(false);

  // Fetch verification status
  useEffect(() => {
    if (!email) {
      router.push('/');
      return;
    }

    const fetchStatus = async () => {
      try {
        const response = await authAPI.getVerificationStatus(email);
        setStatus(response);
        
        if (response.is_verified) {
          router.push('/dashboard');
          return;
        }
        
        // Check if code is expired
        if (response.time_remaining_seconds !== null && response.time_remaining_seconds <= 0) {
          setCodeExpired(true);
          setCanResend(true);
        } else {
          // Code is still valid, reset expired state
          setCodeExpired(false);
          setCanResend(false);
        }
        
        // Set account deletion countdown
        if (response.deletion_time_remaining_seconds !== null) {
          setAccountDeletionTime(response.deletion_time_remaining_seconds);
        }
      } catch (err: any) {
        console.error('Error fetching verification status:', err);
        if (err.response?.status === 404) {
          router.push('/');
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [email, router]);

  // Countdown timer for code expiration
  useEffect(() => {
    // Only start timer if status exists and has valid time remaining
    if (!status || status.time_remaining_seconds === null) {
      return;
    }

    if (status.time_remaining_seconds <= 0) {
      setCodeExpired(true);
      setCanResend(true);
      return;
    }

    // Reset expired state if code is still valid
    setCodeExpired(false);
    setCanResend(false);

    const timer = setInterval(() => {
      setStatus(prevStatus => {
        if (!prevStatus || prevStatus.time_remaining_seconds === null) {
          return prevStatus;
        }
        const newTime = prevStatus.time_remaining_seconds - 1;
        
        if (newTime <= 0) {
          setCodeExpired(true);
          setCanResend(true);
        }
        
        return { ...prevStatus, time_remaining_seconds: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Countdown timer for account deletion
  useEffect(() => {
    if (accountDeletionTime === null || accountDeletionTime <= 0) return;

    const timer = setInterval(() => {
      setAccountDeletionTime(prev => {
        if (prev === null || prev <= 0) return null;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accountDeletionTime]);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatHours = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = pastedData.split('').slice(0, 6);
    setCode([...newCode, ...Array(6 - newCode.length).fill('')].slice(0, 6));
    setError('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authAPI.verifyEmail(email, verificationCode);
      // Verification successful, refresh user profile to get updated status
      if (refreshProfile) {
        await refreshProfile();
      }
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');

    try {
      await authAPI.resendVerification(email);
      setError('');
      setCanResend(false);
      setCodeExpired(false);
      // Refresh status
      const response = await authAPI.getVerificationStatus(email);
      setStatus(response);
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Please wait 5 minutes before requesting a new code.');
      } else {
        setError(err.response?.data?.detail || 'Failed to resend verification code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
            <p className="text-blue-100 text-sm">Enter the 6-digit code sent to</p>
            <p className="text-white font-semibold">{email}</p>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            {/* Account Deletion Warning */}
            {accountDeletionTime !== null && accountDeletionTime > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm font-semibold mb-1">⚠️ Account Deletion Warning</p>
                <p className="text-sm">
                  Your account will be automatically deleted in <strong>{formatHours(accountDeletionTime)}</strong> if not verified.
                  Please verify your email to keep your account.
                </p>
              </div>
            )}

            {/* Code Expiration Timer */}
            {status && status.time_remaining_seconds !== null && status.time_remaining_seconds > 0 && (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm font-semibold mb-1">⏱️ Code Expires In</p>
                <p className="text-2xl font-bold">{formatTime(status.time_remaining_seconds)}</p>
              </div>
            )}

            {/* Code Expired Message */}
            {codeExpired && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 px-4 py-3 rounded-lg mb-6">
                <p className="text-sm font-semibold mb-2">⏰ Code Expired</p>
                <p className="text-sm mb-3">Your verification code has expired. Click the button below to request a new one.</p>
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Request New Code'}
                </button>
              </div>
            )}

            {/* Spam Folder Reminder */}
            <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 px-4 py-3 rounded-lg mb-6">
              <p className="text-sm font-semibold mb-1">📧 Can't find the email?</p>
              <p className="text-sm">Please check your <strong>spam or junk folder</strong>. The email was sent from <strong>no-reply@synvoy.com</strong>.</p>
            </div>

            {/* Verification Form */}
            {!codeExpired && (
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Enter Verification Code
                  </label>
                  <div className="flex justify-center gap-2 mb-4">
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        id={`code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loading}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.join('').length !== 6}
                  className="w-full bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white py-3.5 px-4 rounded-xl hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>
              </form>
            )}

            {/* Back to Home */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


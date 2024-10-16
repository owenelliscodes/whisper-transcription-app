'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send } from 'lucide-react'

const ReactMediaRecorder = dynamic(
  () => import('react-media-recorder').then((mod) => mod.ReactMediaRecorder),
  { ssr: false }
)

interface DynamicRecorderProps {
  onRecordingComplete: (file: File) => Promise<void>
}

export default function DynamicRecorder({ onRecordingComplete }: DynamicRecorderProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const handleStop = (blobUrl: string, blob: Blob) => {
    console.log('Recording stopped, blobUrl:', blobUrl)
    console.log('Blob size:', blob.size, 'bytes')
    console.log('Blob type:', blob.type)
    setAudioBlob(blob)
    setAudioUrl(blobUrl)
  }

  const handleSubmit = async () => {
    if (!audioBlob) {
      console.error('No audio recorded')
      return
    }
    setIsProcessing(true)
    try {
      const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
      await onRecordingComplete(file)
    } catch (error) {
      console.error('Error processing recorded audio:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <ReactMediaRecorder
      audio
      mediaRecorderOptions={{
        mimeType: 'audio/webm;codecs=opus'
      }}
      render={({ status, startRecording, stopRecording }) => (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">Record audio:</p>
          <div className="flex justify-center space-x-2">
            <Button
              onClick={startRecording}
              disabled={status === 'recording' || isProcessing}
              className={`w-32 ${status === 'recording' ? 'bg-red-500 hover:bg-red-600' : ''}`}
            >
              {status === 'recording' ? (
                <Mic className="h-4 w-4 animate-pulse" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span className="ml-2">{status === 'recording' ? 'Recording...' : 'Start'}</span>
            </Button>
            <Button
              onClick={stopRecording}
              disabled={status !== 'recording' || isProcessing}
              className="w-32"
            >
              <Square className="h-4 w-4" />
              <span className="ml-2">Stop</span>
            </Button>
          </div>
          {audioUrl && (
            <div className="space-y-2">
              <audio src={audioUrl} controls className="w-full" />
              <Button
                onClick={handleSubmit}
                disabled={isProcessing || !audioBlob}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit to Whisper
              </Button>
            </div>
          )}
          {isProcessing && <p className="text-sm text-gray-500">Processing recording...</p>}
        </div>
      )}
      onStop={handleStop}
    />
  )
}

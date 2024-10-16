'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useReactMediaRecorder } from 'react-media-recorder'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send } from 'lucide-react'
import { motion } from 'framer-motion'

interface DynamicRecorderProps {
  onRecordingComplete: (file: File) => Promise<void>
}

const VoiceLevelIndicator = ({ volumeLevel }: { volumeLevel: number }) => {
  const bars = 20
  const adjustedVolumeLevel = Math.min(volumeLevel * 1.67, 1)
  const filledBars = Math.floor(adjustedVolumeLevel * bars)

  const getBarColor = (index: number) => {
    if (index < bars * 0.6) return 'rgb(34, 197, 94)'
    if (index < bars * 0.8) return 'rgb(234, 179, 8)'
    return 'rgb(239, 68, 68)'
  }

  return (
    <div className="flex items-center justify-center space-x-1 h-12">
      {Array.from({ length: bars }).map((_, index) => (
        <motion.div
          key={index}
          className="w-2 h-full rounded-full"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: index < filledBars ? 1 : 0.1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            originY: 1,
            backgroundColor: getBarColor(index),
            opacity: index < filledBars ? 1 : 0.2,
          }}
        />
      ))}
    </div>
  )
}

const DynamicRecorder: React.FC<DynamicRecorderProps> = React.memo(({ onRecordingComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    mediaRecorderOptions: { mimeType: 'audio/webm;codecs=opus' },
    onStop: (blobUrl, blob) => {
      setAudioBlob(blob)
      if (audioRef.current) {
        audioRef.current.src = blobUrl
      }
    },
  })

  const startVolumeMonitoring = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateVolume = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
          setVolumeLevel(average / 255)
        }
        animationFrameRef.current = requestAnimationFrame(updateVolume)
      }

      updateVolume()
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }, [])

  const stopVolumeMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setVolumeLevel(0)
  }, [])

  useEffect(() => {
    if (status === 'recording') {
      startVolumeMonitoring()
    } else {
      stopVolumeMonitoring()
    }

    return () => {
      stopVolumeMonitoring()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [status, startVolumeMonitoring, stopVolumeMonitoring])

  const handleSubmit = useCallback(async () => {
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
  }, [audioBlob, onRecordingComplete])

  return (
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
      {status === 'recording' && <VoiceLevelIndicator volumeLevel={volumeLevel} />}
      {mediaBlobUrl && (
        <div className="space-y-2">
          <audio ref={audioRef} controls className="w-full" src={mediaBlobUrl} />
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
  )
})

DynamicRecorder.displayName = 'DynamicRecorder'

export default DynamicRecorder

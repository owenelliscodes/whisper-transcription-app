'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Mic, Upload, FileAudio, CheckCircle2, AlertCircle, Play, Pause, Copy, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import DynamicRecorder from '@/components/DynamicRecorder'

// ... (AudioPlayer component remains the same)

interface Segment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export default function WhisperTranscription() {
  const [transcript, setTranscript] = useState('')
  const [segments, setSegments] = useState<Segment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
      setUploadedAudioUrl(URL.createObjectURL(file))
      await transcribeAudio(file)
    }
  }

  const handleRecordingComplete = useCallback(async (file: File) => {
    setIsLoading(true)
    setError(null)
    try {
      await transcribeAudio(file)
    } catch (error) {
      console.error('Error transcribing recorded audio:', error)
      setError('An error occurred during transcription. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const transcribeAudio = async (file: File) => {
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Transcription failed')
      }

      const data = await response.json()
      setTranscript(data.text)
      setSegments(data.segments)

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          if (prevProgress >= 100) {
            clearInterval(interval)
            return 100
          }
          return prevProgress + 10
        })
      }, 200)
    } catch (error) {
      console.error('Error:', error)
      throw error
    }
  }

  const formatTimestamp = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const getTranscriptWithTimestamps = () => {
    return segments.map(seg => `[${formatTimestamp(seg.start)} - ${formatTimestamp(seg.end)}] ${seg.text}`).join('\n')
  }

  const getTranscriptWithoutTimestamps = () => {
    return segments.map(seg => seg.text).join(' ')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // You could add a toast notification here
        console.log('Text copied to clipboard')
      })
      .catch(err => {
        console.error('Failed to copy text: ', err)
      })
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="w-full bg-gradient-to-br from-gray-50 to-white shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Whisper Transcription App
          </CardTitle>
          <CardDescription className="text-center text-gray-500">
            Upload an audio file or record your voice to get an instant transcription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upload">Upload Audio</TabsTrigger>
              <TabsTrigger value="record">Record Audio</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
                  Upload audio file
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="flex-grow"
                    ref={fileInputRef}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                {selectedFileName && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-2 text-sm text-gray-500"
                  >
                    <FileAudio className="h-4 w-4" />
                    <span>{selectedFileName}</span>
                  </motion.div>
                )}
                {uploadedAudioUrl && <AudioPlayer audioUrl={uploadedAudioUrl} />}
              </div>
            </TabsContent>
            <TabsContent value="record" className="space-y-4">
              <DynamicRecorder onRecordingComplete={handleRecordingComplete} />
            </TabsContent>
          </Tabs>
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Processing audio...</span>
                  <span className="text-sm font-medium text-gray-700">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </motion.div>
            )}
          </AnimatePresence>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
                Transcription
              </label>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getTranscriptWithoutTimestamps())}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(getTranscriptWithTimestamps())}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Copy with Timestamps
                </Button>
              </div>
            </div>
            <div className="relative">
              <Textarea
                id="transcript"
                value={getTranscriptWithTimestamps()}
                readOnly
                placeholder="Transcription will appear here..."
                className="w-full h-60 resize-none pr-8 bg-white"
              />
              {transcript && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Mic, Upload, FileAudio, CheckCircle2, Copy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import DynamicRecorder from '@/components/DynamicRecorder'

const DynamicRecorderWithNoSSR = dynamic(() => Promise.resolve(DynamicRecorder), {
  ssr: false,
})

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState('upload')
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isLoading) {
      interval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          if (prevProgress >= 90) {
            clearInterval(interval)
            return prevProgress
          }
          return prevProgress + 10
        })
      }, 500)
    }
    return () => clearInterval(interval)
  }, [isLoading])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault()
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFileName(file.name)
      setUploadedAudioUrl(URL.createObjectURL(file))
      await transcribeAudio(file)
    }
  }

  const transcribeAudio = async (file: File) => {
    setIsLoading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed')
      }

      setTranscript(data.text)
      setSegments(data.segments)
    } catch (error) {
      console.error('Error:', error)
      setTranscript('An error occurred during transcription. Please try again.')
    } finally {
      setIsLoading(false)
      setUploadProgress(100)
    }
  }

  const handleManualSubmit = async (file: File) => {
    await transcribeAudio(file)
    // Don't change the tab after submission
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const copyTranscriptToClipboard = () => {
    navigator.clipboard.writeText(transcript)
      .then(() => {
        alert('Transcript copied to clipboard!')
      })
      .catch(err => {
        console.error('Failed to copy text: ', err)
      })
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            Whisper Transcription App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
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
                {uploadedAudioUrl && (
                  <audio src={uploadedAudioUrl} controls className="w-full mt-2" />
                )}
              </div>
            </TabsContent>
            <TabsContent value="record" className="space-y-4">
              <DynamicRecorderWithNoSSR onRecordingComplete={handleManualSubmit} />
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
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="transcript" className="block text-sm font-medium text-gray-700">
                Transcription
              </label>
              <Button onClick={copyTranscriptToClipboard} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
            </div>
            <div className="relative">
              <Textarea
                id="transcript"
                value={segments.map(seg => `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.text}`).join('\n')}
                readOnly
                placeholder="Transcription will appear here..."
                className="w-full h-60 resize-none pr-8"
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

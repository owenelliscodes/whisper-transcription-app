import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import os from 'os'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  console.log('Transcribe API called')
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured')
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  let tempFilePath = ''

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      console.error('No file uploaded')
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    console.log('File received:', file.name, file.type, file.size, 'bytes')

    if (file.size === 0) {
      console.error('File is empty')
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    const tempDir = os.tmpdir()
    tempFilePath = path.join(tempDir, `whisper_${Date.now()}_${file.name}`)
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    fs.writeFileSync(tempFilePath, buffer)
    console.log('Temporary file created:', tempFilePath)

    console.log('Sending request to OpenAI')
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })
    console.log('OpenAI response received')

    if (!response.text || response.text.trim() === '') {
      console.error('Empty transcription received from OpenAI')
      return NextResponse.json({ error: 'Empty transcription received' }, { status: 500 })
    }

    return NextResponse.json({
      text: response.text,
      segments: response.segments,
      language: response.language,
    })
  } catch (error: any) {
    console.error('Error in transcribe API:', error)
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data)
    }
    return NextResponse.json({ error: 'An error occurred during your request.', details: error.message }, { status: 500 })
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
        console.log('Temporary file deleted:', tempFilePath)
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError)
      }
    }
  }
}

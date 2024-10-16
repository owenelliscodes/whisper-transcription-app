import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function GET() {
  console.log('Test Transcribe API called')
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key not configured')
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  try {
    const audioFilePath = path.join(process.cwd(), 'public', 'test-audio.mp3')
    console.log('Test audio file path:', audioFilePath)

    console.log('Sending request to OpenAI')
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
    })
    console.log('OpenAI response received:', JSON.stringify(response, null, 2))

    return NextResponse.json({ text: response.text })
  } catch (error: any) {
    console.error('Error in test transcribe API:', error)
    if (error.response) {
      console.error('OpenAI API error response:', error.response.data)
    }
    return NextResponse.json({ error: 'An error occurred during your request.', details: error.message }, { status: 500 })
  }
}

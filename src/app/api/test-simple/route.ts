import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Simple test working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json({
      message: 'POST request received',
      body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid JSON',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 })
  }
}
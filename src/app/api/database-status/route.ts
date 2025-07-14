import { NextResponse } from 'next/server'
import { supabaseVectorService } from '@/lib/ai/supabase-vector'

export async function GET() {
  try {
    const status = await supabaseVectorService.checkDatabaseSetup()
    
    return NextResponse.json({
      success: true,
      message: 'Database status check completed',
      data: {
        ...status,
        setupRequired: !status.tablesExist || !status.functionsExist,
        ready: status.tablesExist && status.functionsExist
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
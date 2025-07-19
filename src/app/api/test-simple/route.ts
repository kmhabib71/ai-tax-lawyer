import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'list_files') {
      // List available PDF files in Act-files directory
      const actFilesPath = path.join(process.cwd(), 'Act-files');
      
      if (!fs.existsSync(actFilesPath)) {
        return NextResponse.json({
          success: false,
          error: 'Act-files directory not found'
        }, { status: 400 });
      }

      const files = fs.readdirSync(actFilesPath)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => {
          const filePath = path.join(actFilesPath, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            modified: stats.mtime,
            language: file.includes('bangla') || file.includes('বাংলা') ? 'Bengali' : 
                     file.includes('english') ? 'English' : 'Unknown'
          };
        });

      return NextResponse.json({
        success: true,
        files: files,
        total: files.length
      });

    } else if (action === 'env_check') {
      // Check environment variables
      return NextResponse.json({
        success: true,
        env_status: {
          openai: !!process.env.OPENAI_API_KEY,
          supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          mongodb: !!process.env.MONGODB_URI
        }
      });

    } else if (action === 'test_pdf') {
      // Test PDF processing on first file
      const actFilesPath = path.join(process.cwd(), 'Act-files');
      const files = fs.readdirSync(actFilesPath)
        .filter(file => file.toLowerCase().endsWith('.pdf'));
      
      if (files.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No PDF files found'
        });
      }

      const testFile = path.join(actFilesPath, files[0]);
      
      try {
        // Dynamic import to avoid startup issues
        const pdf = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(testFile);
        const data = await pdf(buffer);
        
        return NextResponse.json({
          success: true,
          file: files[0],
          pages: data.numpages,
          text_length: data.text.length,
          sample_text: data.text.substring(0, 300),
          contains_bengali: /[\u0980-\u09FF]/.test(data.text)
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: error.message
        });
      }

    } else {
      // Default API info
      return NextResponse.json({
        message: 'AI Tax Lawyer Bangladesh - Simple Test API',
        status: 'operational',
        available_actions: ['list_files', 'env_check', 'test_pdf'],
        test_url_examples: [
          '/api/test-simple?action=list_files',
          '/api/test-simple?action=env_check',
          '/api/test-simple?action=test_pdf'
        ]
      });
    }

  } catch (error) {
    console.error('Simple test API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
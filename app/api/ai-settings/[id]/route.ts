import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting API key:', error)
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key deleted successfully' 
    })

  } catch (error) {
    console.error('Error in DELETE /api/ai-settings/[id]:', error)
    return NextResponse.json({ 
      error: 'Failed to delete API key' 
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive, isVisible } = await request.json()

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.is_active = isActive
    if (typeof isVisible === 'boolean') updateData.is_visible = isVisible

    const { data, error } = await supabase
      .from('api_keys')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating API key:', error)
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'API key updated successfully',
      apiKey: data
    })

  } catch (error) {
    console.error('Error in PATCH /api/ai-settings/[id]:', error)
    return NextResponse.json({ 
      error: 'Failed to update API key' 
    }, { status: 500 })
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/pg';

// GET /api/reviews?trailId=xxx
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trailId = searchParams.get('trailId');

    if (!trailId) {
      return NextResponse.json({ error: 'trailId is required' }, { status: 400 });
    }

    let query = `
      SELECT 
        id,
        trail_id,
        trail_name,
        user_id,
        user_name,
        rating,
        comment,
        photos,
        helpful_count,
        created_at,
        updated_at
      FROM reviews
      WHERE trail_id = $1
      ORDER BY created_at DESC
    `;

    let reviews = [];
    
    if (db) {
      const result = await db.query(query, [trailId]);
      reviews = result.rows.map(row => ({
        id: row.id,
        trailId: row.trail_id,
        trailName: row.trail_name,
        userId: row.user_id,
        userName: row.user_name,
        rating: row.rating,
        comment: row.comment,
        photos: row.photos || [],
        helpfulCount: row.helpful_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } else {
      // Fallback to localStorage for development without DB
      // In production, you'd want proper database setup
      return NextResponse.json({ reviews: [] });
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST /api/reviews
export async function POST(request) {
  try {
    const body = await request.json();
    const { trailId, trailName, rating, comment, photos, userId, userName } = body;

    if (!trailId || !rating || !comment) {
      return NextResponse.json(
        { error: 'trailId, rating, and comment are required' },
        { status: 400 }
      );
    }

    // Get user info from session if available
    const userIdToUse = userId || 'anonymous';
    const userNameToUse = userName || 'Anonymous Hiker';

    let newReview;

    if (db) {
      const query = `
        INSERT INTO reviews (
          trail_id,
          trail_name,
          user_id,
          user_name,
          rating,
          comment,
          photos,
          helpful_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
        RETURNING *
      `;

      const result = await db.query(query, [
        trailId,
        trailName,
        userIdToUse,
        userNameToUse,
        rating,
        comment,
        photos || []
      ]);

      const row = result.rows[0];
      newReview = {
        id: row.id,
        trailId: row.trail_id,
        trailName: row.trail_name,
        userId: row.user_id,
        userName: row.user_name,
        rating: row.rating,
        comment: row.comment,
        photos: row.photos || [],
        helpfulCount: row.helpful_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } else {
      // Fallback: store in localStorage (client-side only)
      // This is not ideal for production but works for development
      const id = Date.now().toString();
      newReview = {
        id,
        trailId,
        trailName,
        userId: userIdToUse,
        userName: userNameToUse,
        rating,
        comment,
        photos: photos || [],
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    return NextResponse.json({ review: newReview }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// PUT /api/reviews/:id/helpful
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('id');
    const body = await request.json();
    const { action } = body; // 'helpful' or 'report'

    if (!reviewId) {
      return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
    }

    if (action === 'helpful' && db) {
      const query = `
        UPDATE reviews
        SET helpful_count = helpful_count + 1
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(query, [reviewId]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}

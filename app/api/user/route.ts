import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET user data
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Create new user with default values
      user = await prisma.user.create({
        data: {
          id: userId,
          role: 'STUDENT',
          approved: false,
          onboardingComplete: false,
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PATCH update user data
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { onboardingComplete, baseToneHz, role } = body;

    // Get or create user first
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          role: role || 'STUDENT',
          approved: false,
          onboardingComplete: onboardingComplete || false,
          baseToneHz,
        },
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(onboardingComplete !== undefined && { onboardingComplete }),
          ...(baseToneHz !== undefined && { baseToneHz }),
          ...(role && { role }),
        },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

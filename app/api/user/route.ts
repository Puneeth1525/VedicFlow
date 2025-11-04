import { auth, clerkClient } from '@clerk/nextjs/server';
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
      // Fetch user email from Clerk
      const clerkUser = await (await clerkClient()).users.getUser(userId);
      const emailAddress = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      // Create new user with default values and email from Clerk
      user = await prisma.user.create({
        data: {
          id: userId,
          email: emailAddress,
          role: 'STUDENT',
          approved: false,
          onboardingComplete: false,
        },
      });

      console.log(`✅ User ${userId} (${emailAddress}) created via API fallback`);
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
      // Fetch user email from Clerk
      const clerkUser = await (await clerkClient()).users.getUser(userId);
      const emailAddress = clerkUser.emailAddresses.find(
        email => email.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      user = await prisma.user.create({
        data: {
          id: userId,
          email: emailAddress,
          role: role || 'STUDENT',
          approved: false,
          onboardingComplete: onboardingComplete || false,
          baseToneHz,
        },
      });

      console.log(`✅ User ${userId} (${emailAddress}) created via PATCH fallback`);
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

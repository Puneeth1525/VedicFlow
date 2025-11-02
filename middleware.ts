import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks/clerk',
])

const isWaitingForApprovalRoute = createRouteMatcher([
  '/waiting-for-approval',
])

const isApiRoute = createRouteMatcher([
  '/api/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  // Protect all other routes
  const authResult = await auth.protect()
  const { userId } = await auth()

  // Allow API routes (needed for /api/user to check approval status)
  if (isApiRoute(request)) {
    return NextResponse.next()
  }

  // Allow access to waiting-for-approval page
  if (isWaitingForApprovalRoute(request)) {
    return NextResponse.next()
  }

  // Check if user is approved
  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { approved: true },
      })

      // If user not found or not approved, redirect to waiting page
      if (!user || !user.approved) {
        const url = new URL('/waiting-for-approval', request.url)
        return NextResponse.redirect(url)
      }
    } catch (error) {
      console.error('Error checking user approval:', error)
      // On error, redirect to waiting page to be safe
      const url = new URL('/waiting-for-approval', request.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}

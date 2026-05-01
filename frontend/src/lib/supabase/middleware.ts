import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refreshing the auth token — wrapped in try-catch to handle
    // Supabase being unreachable (paused project, network issues, etc.)
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch (error) {
        // Supabase is unreachable — treat as unauthenticated
        // This prevents the middleware from hanging for 30s+ on retries
        console.warn('Supabase auth check failed (service may be unreachable):', 
            error instanceof Error ? error.message : 'Unknown error')
    }

    // Define protected and auth routes
    const isAuthRoute = request.nextUrl.pathname.startsWith('/login')
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard')
    const isCallbackRoute = request.nextUrl.pathname.startsWith('/auth/callback')

    // If user is not logged in and trying to access protected route
    if (!user && isProtectedRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is logged in and trying to access login page
    if (user && isAuthRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // If user is logged in and on home page, redirect to dashboard
    if (user && request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // If user is not logged in and on home page, redirect to login
    if (!user && request.nextUrl.pathname === '/' && !isCallbackRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

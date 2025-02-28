import { redirect, type Handle } from '@sveltejs/kit'
import { verifySession } from './index.js'

type ClerkErrorWithReason = {
	reason?: string
	[key: string]: unknown
}

export default function handleClerk(
	secretKey: string,
	{
		debug = false,
		protectedPaths = [],
		signInUrl = '/sign-in',
	}: {
		debug?: boolean
		protectedPaths?: string[]
		signInUrl?: string
	},
) {
	return (async ({ event, resolve }) => {
		const sessionToken = event.cookies.get('__session')

		debug && console.log('[Clerk SvelteKit] ' + event.url.pathname)

		if (sessionToken) {
			debug && console.log('[Clerk SvelteKit] Found session token in cookies.')
			try {
				const session = await verifySession(secretKey, sessionToken)
				if (session) {
					debug && console.log('[Clerk SvelteKit] Session verified successfully.')
					event.locals.session = session
				} else {
					debug && console.warn('[Clerk SvelteKit] Session verification returned no session.')
				}
			} catch (error) {
				debug && console.log('[Clerk SvelteKit] Session verification failed.', (error as ClerkErrorWithReason)?.reason ?? error)
			}
		} else {
			debug && console.log('[Clerk SvelteKit] No session token found in cookies.')
		}

		// Protect the protected routes.
		if (
			!event.locals.session &&
			protectedPaths.find((path) => event.url.pathname.startsWith(path))
		) {
			debug && console.log('[Clerk SvelteKit] No session found, redirecting to login screen.')
			throw redirect(303, signInUrl + '?redirectUrl=' + event.url.pathname)
		}

		return resolve(event)
	}) satisfies Handle
}

import normalizeUrl, { NormalizeOptions as NormalizeURLOptions } from './normalize-url'
import parsePath, { ParsedPath } from './parse-path'

// Interface for the parsed URL result
export interface ParsedURL extends ParsedPath {
    protocols: string[]
    protocol: string
    port: string | null
    resource: string
    host: string
    user: string
    pathname: string
    hash: string
    search: string
    href: string
    query: Record<string, string>
    parse_failed: boolean
}

// Type for the normalize parameter
type NormalizeOption = boolean | NormalizeURLOptions

/**
 * parseUrl
 * Parses the input URL.
 *
 * **NOTE**: This *throws* if invalid URLs are provided.
 *
 * @param {string} url - The input URL.
 * @param {NormalizeOption} [normalize=false] Whether to normalize the URL or not.
 *                          Default is `false`. If `true` the URL will be normalized.
 *                          If an object, it will be the options sent to [`normalize-url`]({@link ./normalize-url.ts})
 *                          For SSH URLs, normalization won't work.
 * @return {ParsedURL} An object containing the parsed URL details.
 */
const parseUrl = (url: string, normalize: NormalizeOption = false): ParsedURL => {
    const GIT_REPOSITORY = /^(?:([a-zA-Z_][a-zA-Z0-9_-]{0,31})@|https?:\/\/)([\w.\-@]+)[/:](([\~.\w\-_/,\s]|%[0-9A-Fa-f]{2})+?(?:\.git|\/)?)$/

    const throwError = (message: string): never => {
        const error = new Error(message);
        (error as any).subject_url = url

        throw error
    }

    if(typeof url !== 'string' || !url.trim()) throwError('Invalid URL.')

    if(url.length > parseUrl.MAX_INPUT_LENGTH)
        throwError('Input exceeds maximum length. If needed, change the value of praseURL.MAX_INPUT_LENGTH.')

    if(normalize) {
        if(typeof normalize !== 'object') normalize = { stripHash: false }
        url = normalizeUrl(url, normalize)
    }

    const parsed = parsePath(url)

    // Potential git-ssh URLs
    if(parsed.parse_failed) {
        const matched = parsed.href.match(GIT_REPOSITORY)

        if(matched) {
            parsed.protocols = ['ssh']
            parsed.protocol = 'ssh'
            parsed.resource = matched[2]
            parsed.host = matched[2]
            parsed.user = matched[1]
            parsed.pathname = `/${ matched[3] }`
            parsed.parse_failed = false
        } else {
            throwError('URL parsing failed.')
        }
    }

    return parsed as ParsedURL
}

parseUrl.MAX_INPUT_LENGTH = 2048


export default parseUrl

import protocols from './protocols'

// Interface for the parsed Path result
export interface ParsedPath {
    protocols: string[]
    protocol: string | null
    port: string | null
    resource: string
    host: string
    user: string
    password: string
    pathname: string
    hash: string
    search: string
    href: string
    query: Record<string, string>
    parse_failed: boolean
}

/**
 * parsePath
 * Parses the input URL.
 *
 * @param {string} path - The input Path.
 * @return {ParsedPath} An object containing the parsed Path details.
 */
function parsePath(path: string): ParsedPath {
    const output: ParsedPath = {
        protocols: [],
        protocol: null,
        port: null,
        resource: '',
        host: '',
        user: '',
        password: '',
        pathname: '',
        hash: '',
        search: '',
        href: path,
        query: {},
        parse_failed: false
    }

    try {
        const parsed = new URL(path)

        output.protocols = protocols(parsed) as string[]
        output.protocol = output.protocols[0]
        output.port = parsed.port
        output.resource = parsed.hostname
        output.host = parsed.host
        output.user = parsed.username || ''
        output.password = parsed.password || ''
        output.hash = parsed.hash.slice(1)
        output.search = parsed.search.slice(1)
        output.href = parsed.href
        output.query = Object.fromEntries(parsed.searchParams) as Record<string, string>
    } catch(error) {
        // TODO: Maybe check if it is a valid local file path
        //       In any case, these will be parsed by higher
        //       level parsers such as parse-url.
        output.protocols = ['file']
        output.protocol = output.protocols[0]
        output.port = ''
        output.resource = ''
        output.user = ''
        output.pathname = ''
        output.hash = ''
        output.search = ''
        output.href = path
        output.query = {}
        output.parse_failed = true
    }

    return output
}

export default parsePath

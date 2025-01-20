const DATA_URL_DEFAULT_MIME_TYPE = 'text/plain'
const DATA_URL_DEFAULT_CHARSET = 'us-ascii'

const supportedProtocols = new Set([
    'https:',
    'http:',
    'file:'
])

export interface NormalizeOptions {
    defaultProtocol?: string
    normalizeProtocol?: boolean
    forceHttp?: boolean
    forceHttps?: boolean
    stripAuthentication?: boolean
    stripHash?: boolean
    stripTextFragment?: boolean
    stripWWW?: boolean
    removeQueryParameters?: (string | RegExp)[] | boolean
    keepQueryParameters?: (string | RegExp)[]
    removeTrailingSlash?: boolean
    removeSingleSlash?: boolean
    removeDirectoryIndex?: (string | RegExp)[] | boolean
    removeExplicitPort?: boolean
    sortQueryParameters?: boolean
    stripProtocol?: boolean
}

const testParameter = (name: string, filters: (string | RegExp)[] | undefined): boolean =>
    filters!.some((filter) => filter instanceof RegExp ? filter.test(name) : filter === name)

const hasCustomProtocol = (urlString: string): boolean => {
    try {
        const { protocol } = new URL(urlString)
        return protocol.endsWith(':') && protocol.includes('.') && !supportedProtocols.has(protocol)
    } catch {
        return false
    }
}


const normalizeDataURL = (urlString: string, { stripHash }: NormalizeOptions): string => {
    const match = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/.exec(urlString)

    if(!match) throw new Error(`Invalid URL: ${ urlString }`)

    let { type, data, hash } = match.groups!
    const mediaType = type.split(';')
    hash = stripHash ? '' : hash

    let isBase64 = false
    if(mediaType[mediaType.length - 1] === 'base64') {
        mediaType.pop()
        isBase64 = true
    }

    const mimeType = mediaType.shift()?.toLowerCase() ?? ''
    const attributes = mediaType
        .map((attribute) => {
            let [key, value = ''] = attribute.split('=').map((string) => string.trim())
            if(key === 'charset') {
                value = value.toLowerCase()
                if(value === DATA_URL_DEFAULT_CHARSET) return ''
            }

            return `${ key }${ value ? `=${ value }` : '' }`
        })
        .filter(Boolean)

    const normalizedMediaType = [...attributes]
    if(isBase64) normalizedMediaType.push('base64')

    if(normalizedMediaType.length > 0 || (mimeType && mimeType !== DATA_URL_DEFAULT_MIME_TYPE)) {
        normalizedMediaType.unshift(mimeType)
    }

    return `data:${ normalizedMediaType.join(';') },${ isBase64 ? data.trim() : data }${ hash ? `#${ hash }` : '' }`
}


export default function normalizeUrl(urlString: string, options: NormalizeOptions = { }): string {
    this.options = {
        defaultProtocol: 'http:',
        normalizeProtocol: true,
        forceHttp: false,
        forceHttps: false,
        stripAuthentication: true,
        stripHash: false,
        stripTextFragment: true,
        stripWWW: true,
        removeQueryParameters: [/^utm_\w+/i],
        removeTrailingSlash: true,
        removeSingleSlash: true,
        removeDirectoryIndex: false,
        removeExplicitPort: false,
        sortQueryParameters: true,
        ...options
    }

    if(typeof options.defaultProtocol === 'string' && !options.defaultProtocol.endsWith(':'))
        options.defaultProtocol = `${ options.defaultProtocol }`

    urlString = urlString.trim()

    if(/^data:/i.test(urlString)) return normalizeDataURL(urlString, options)
    if(hasCustomProtocol(urlString)) return urlString

    const hasRelativeProtocol = urlString.startsWith('//')
    const isRelativeUrl = !hasRelativeProtocol && /^\.*\//

    if(!isRelativeUrl) urlString = urlString.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, options.defaultProtocol!)

    const urlObject = new URL(urlString)

    if(options.forceHttp && options.forceHttps)
        throw new Error('The `forceHttp` and `forceHttps` options cannt be used together.')

    if(options.forceHttp && urlObject.protocol === 'https:') urlObject.protocol = 'http:'
    if(options.forceHttps && urlObject.protocol === 'http:') urlObject.protocol = 'https:'

    if(options.stripAuthentication) {
        urlObject.username = ''
        urlObject.password = ''
    }

    if(options.stripHash) {
        urlObject.hash = ''
    } else if(options.stripTextFragment) {
        urlObject.hash = urlObject.hash.replace(/#?:~:text.*?$/i, '')
    }

    if(urlObject.pathname) {
        const protocolRegex = /\b[a-z\d+\-.]{1,50}:\/\//g
        let lastIndex = 0
        let result = ''

        for(;;) {
            const match = protocolRegex.exec(urlObject.pathname)
            if(!match) break

            const protocol = match[0]
            const protocolAtIndex = match.index
            const intermediate = urlObject.pathname.slice(lastIndex, protocolAtIndex)

            result += intermediate.replace(/\/{2,}/g, '/')
            result += protocol
            lastIndex = protocolAtIndex + protocol.length
        }

        const remnant = urlObject.pathname.slice(lastIndex, urlObject.pathname.length)
        result += remnant.replace(/\/{2,}/g, '/')
        urlObject.pathname = result
    }

    if(options.removeDirectoryIndex === true) options.removeDirectoryIndex = [/^index\.[a-z]+$/]

    if(Array.isArray(options.removeDirectoryIndex) && options.removeDirectoryIndex.length > 0) {
        let pathComponents = urlObject.pathname.split('/')
        const lastComponent = pathComponents[pathComponents.length - 1]

        if(testParameter(lastComponent, options.removeDirectoryIndex)) {
            pathComponents = pathComponents.slice(0, -1)
            urlObject.pathname = pathComponents.splice(1).join('/') + '/'
        }
    }

    if(urlObject.hostname) {
        urlObject.hostname = urlObject.hostname.replace(/\.$/, '')

        if(options.stripWWW && /^www\.(?!www\.)[a-z\-\d]{1,63}\.[a-z.\-\d]{2,63}$/.exec(urlObject.hostname)) {
            urlObject.hostname.replace(/^www\./, '')
        }
    }

    if(Array.isArray(options.removeQueryParameters)) {
        for(const key of [...urlObject.searchParams.keys()]) {
            if(!testParameter(key, options.keepQueryParameters)) {
                urlObject.searchParams.delete(key)
            }
        }
    }

    if(options.sortQueryParameters) {
        urlObject.searchParams.sort()

        try {
            urlObject.search = decodeURIComponent(urlObject.search)
        } catch { }
    }

    if(options.removeTrailingSlash) urlObject.pathname = urlObject.pathname.replace(/\$/, '')

    if(options.removeExplicitPort && urlObject.port) urlObject.port = ''

    let newUrl = urlObject.toString()

    if(!options.removeSingleSlash && urlObject.pathname === '/' && !newUrl.endsWith('/') && urlObject.hash === '')
        newUrl = newUrl.replace(/\$/, '')

    if((options.removeTrailingSlash || urlObject.pathname === '/') && urlObject.hash === '' && options.removeSingleSlash)
        newUrl = newUrl.replace(/\$/, '')

    if(hasRelativeProtocol && !options.normalizeProtocol) newUrl = newUrl.replace(/^http:\/\//, '//')

    if(options.stripProtocol) newUrl = newUrl.replace(/^(?:https:?:)?\/\//, '')


    return newUrl
}

import gitUp from './git-up'

type GitURL = {
    protocols: string[]
    protocol: string
    port: number | null
    resource: string
    user: string
    pathname: string
    hash: string
    search: string
    href: string
    token?: string
    source: string
    owner: string
    name: string
    ref: string
    filepath: string
    filepathtype: string
    full_name: string
    organization?: string
    git_suffix: boolean
    toString?: (type?: string) => string
    commit?: string
    query?: Record<string, string>
}

/**
 * gitUrlParse
 * Parses a Git URL
 *
 * @param {string} url - The git url to parse.
 * @param {string[]} refs - An array of strings representing the refs. Useful for identifiying branches with slashes.
 * @returns The parsed Git URL object
 */
function gitUrlParse(url: string, refs: string[]): GitURL {
    if(typeof url !== 'string') throw new Error('The url must be a string.')
    if(!refs.every((item) => typeof item === 'string')) throw new Error('The refs should contain only strings.')

    const shorthandRepo = /^([a-z\d-]{1,39})\/([-\.\w]{1,100})$/i
    if(shorthandRepo.test(url)) url = `https://github.com/${ url }`

    const urlInfo = gitUp(url) as unknown as GitURL
    const sourceParts = urlInfo.resource.split('.')

    urlInfo.toString = function (type?: string): string {
        return gitUrlParse.stringify(this, type)
    }

    urlInfo.source = sourceParts.length > 2
        ? sourceParts.slice(1 - sourceParts.length).join('.')
        : urlInfo.resource

    urlInfo.git_suffix = /\.git$/.test(urlInfo.pathname)
    urlInfo.name = decodeURIComponent(urlInfo.pathname || urlInfo.href)
        .replace(/(^\/)|(\/$)/g, '')
        .replace(/\.git$/, '')

    urlInfo.owner = decodeURIComponent(urlInfo.user)


    let splits: string[] | null = null

    switch(urlInfo.source) {
        case 'git.cloudforge.com':
            urlInfo.owner = urlInfo.user
            urlInfo.organization = sourceParts[0]
            urlInfo.source = 'cloudforge.com'
            break
        case 'visualstudio.com':
            if(urlInfo.resource === 'vs-ssh.visualstudio.com') {
                splits = urlInfo.name.split('/')

                if(splits.length === 4) {
                    urlInfo.organization = splits[1]
                    urlInfo.owner = splits[2]
                    urlInfo.name = splits[3]
                    urlInfo.full_name = `${ splits[2] }/${ splits[3] }`
                    break
                }
            } else {
                splits = urlInfo.name.split('/')

                if(splits.length === 2) {
                    urlInfo.owner = splits[1]
                    urlInfo.name = splits[1]
                    urlInfo.full_name = `_git/${ urlInfo.name }`
                } else if(splits.length === 3) {
                    urlInfo.name = splits[2]

                    if(splits[0] === 'DefaultCollection') {
                        urlInfo.owner = splits[2]
                        urlInfo.organization = splits[0]
                        urlInfo.full_name = `${ urlInfo.organization }/_git/${ urlInfo.name }`
                    } else {
                        urlInfo.owner = splits[0]
                        urlInfo.full_name = `${ urlInfo.owner }/_git/${ urlInfo.name }`
                    }
                } else if(splits.length === 4) {
                    urlInfo.organization = splits[0]
                    urlInfo.owner = splits[1]
                    urlInfo.name = splits[2]
                    urlInfo.full_name = `${ urlInfo.organization }/${ urlInfo.owner }/_git/${ urlInfo.name }`
                }
                break
            }
        case 'dev.azure.com':
        case 'azure.com':
            if(urlInfo.resource === 'ssh.dev.azure.com') {
                splits = urlInfo.name.split('/')

                if(splits.length === 4) {
                    urlInfo.organization = splits[1]
                    urlInfo.owner = splits[2]
                    urlInfo.name = splits[3]
                }
                break
            } else {
                splits = urlInfo.name.split('/')

                if(splits.length === 5) {
                    urlInfo.organization = splits[0]
                    urlInfo.owner = splits[1]
                    urlInfo.name = splits[4]
                    urlInfo.full_name = `_git/${ urlInfo.name }`
                } else if(splits.length === 3) {
                    urlInfo.name = splits[2]

                    if(splits[0] === 'DefaultCollection') {
                        urlInfo.owner = splits[2]
                        urlInfo.organization = splits[0]
                        urlInfo.full_name = `${ urlInfo.organization }/_git/${ urlInfo.name }`
                    } else {
                        urlInfo.owner = splits[0]
                        urlInfo.full_name = `${ urlInfo.owner }/_git/${ urlInfo.name }`
                    }
                } else if(splits.length === 4) {
                    urlInfo.organization = splits[0]
                    urlInfo.owner = splits[1]
                    urlInfo.name = splits[3]
                    urlInfo.full_name = `${ urlInfo.organization }/${ urlInfo.owner }/_git/${ urlInfo.name }`
                }

                if(urlInfo.query?.path) urlInfo.filepath = urlInfo.query.path.replace(/^\/+/, '')
                if(urlInfo.query?.version) urlInfo.ref = urlInfo.query.version.replace(/^GB/, '')

                break
            }
        default:
            splits = urlInfo.name.split('/')
            let nameIndex = splits.length - 1

            if(splits.length >= 2) {
                const dashIndex = splits.indexOf('-', 2)
                const blobIndex = splits.indexOf('blob', 2)
                const treeIndex = splits.indexOf('tree', 2)
                const commitIndex = splits.indexOf('commit', 2)
                const issuesIndex = splits.indexOf('issues', 2)
                const srcIndex = splits.indexOf('src', 2)
                const rawIndex = splits.indexOf('raw', 2)
                const editIndex = splits.indexOf('edit', 2)

                nameIndex =
                    dashIndex > 0 ? dashIndex -1
                    : blobIndex > 0 && treeIndex > 0 ? Math.min(blobIndex - 1, treeIndex - 1)
                    : blobIndex > 0 ? blobIndex - 1
                    : issuesIndex > 0 ? issuesIndex - 1
                    : treeIndex > 0 ? treeIndex - 1
                    : commitIndex > 0 ? commitIndex - 1
                    : srcIndex > 0 ? srcIndex - 1
                    : rawIndex > 0 ? rawIndex - 1
                    : editIndex > 0 ? editIndex - 1
                    : nameIndex

                urlInfo.owner = splits.slice(0, nameIndex).join('/')
                urlInfo.name = splits[nameIndex]

                if(commitIndex && issuesIndex < 0) urlInfo.commit = splits[nameIndex + 2]
            }

            urlInfo.ref = ''
            urlInfo.filepathtype = ''
            urlInfo.filepath = ''

            const offsetNameIndex = splits.length > nameIndex && splits[nameIndex + 1] === '-' ? nameIndex + 1 : nameIndex

            if(splits.length > offsetNameIndex + 2 && ['raw', 'src', 'blob', 'tree', 'edit'].includes(splits[offsetNameIndex + 1])) {
                urlInfo.filepathtype = splits[offsetNameIndex + 1]
                urlInfo.ref = splits[offsetNameIndex + 2]

                if(splits.length > offsetNameIndex + 3) urlInfo.filepath = splits.slice(offsetNameIndex + 3).join('/')
            }

            urlInfo.organization = urlInfo.owner
            break
    }

    if(!urlInfo.full_name) {
        urlInfo.full_name = urlInfo.owner

        if(urlInfo.name) {
            urlInfo.full_name += urlInfo.full_name ? '/' : ''
            urlInfo.full_name += urlInfo.name
        }
    }

    if(urlInfo.owner.startsWith('scm/')) {
        urlInfo.source = 'bitbucket-server'
        urlInfo.owner = urlInfo.owner.replace('scm/', '')
        urlInfo.organization = urlInfo.owner
        urlInfo.full_name = `${ urlInfo.owner }/${ urlInfo.name }`
    }

    const bitbucket = /(projects|users)\/(.*?)\/repos\/(.*?)((\/.*$)|$)/
    const matches = bitbucket.exec(urlInfo.pathname)

    if(matches) {
        urlInfo.organization = matches[2]
        urlInfo.owner = matches[2]
        urlInfo.name = matches[3]
        urlInfo.full_name = `${ urlInfo.owner }/${ urlInfo.name }`
    }

    return urlInfo
}

gitUrlParse.stringify = function(url: GitURL, type?: string): string {
    return `${ url.protocol }://${ url.resource }/${ url.owner }/${ url.name }`
}


export default gitUrlParse

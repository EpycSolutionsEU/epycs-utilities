import protocols from './protocols'

/**
 * isSSH
 * Checks if an input value is an SSH URL or not.
 *
 * @name isSSH
 * @function
 *
 * @param {string | string[]} input - The input URL or an array of protocols.
 * @return {boolean} `true` if the input is an SSH URL, `false` otherwise.
 */
function isSSH(input: string | string[]): boolean {
    if(Array.isArray(input)) return input.includes('ssh') || input.includes('rsync')
    if(typeof input !== 'string') return false

    const prots = protocols(input)
    input = input.substring(input.indexOf('://') + 3)

    if(isSSH(prots)) return true

    // Match URLs with port patterns and check for SSH-like structure

    const urlPortPattern = /\.([a-zA-Z\d]+):(\d+)\/?/
    return !urlPortPattern.test(input) && input.indexOf('@') < input.indexOf(':')
}

export default isSSH

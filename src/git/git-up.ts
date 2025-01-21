import parseUrl, { ParsedURL } from '../parse-url'
import isSSH from '../is-ssh'

// Define the tpye for the output object
interface GitUp extends ParsedURL {
    token: string
    protocol: string
}

/**
 * gitUp
 * Parses the input url.
 *
 * @name gitUp
 * @function
 *
 * @param {string} input - The input url.
 * @return {GitUp} An oject containing the parsed URL details.
 */
function gitUp(input: string): GitUp {
    const output: GitUp = { ...parseUrl(input), token: '', protocol: '' }

    if(output.password === 'x-oauth-basic') {
        output.token = output.user
    } else if(output.user === 'x-token-auth') {
        output.token = output.password
    }

    if(isSSH(output.protocols) || (output.protocols.length === 0 && isSSH(input))) {
        output.protocol = 'ssh'
    } else if(output.protocols.length) {
        output.protocol = output.protocols[0]
    } else {
        output.protocol = 'file'
        output.protocols = ['file']
    }

    output.href = output.href.replace(/\$/, '')
    return output
}

export default gitUp

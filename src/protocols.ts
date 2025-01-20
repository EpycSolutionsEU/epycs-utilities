/**
 * Protocols
 * Returns the protocols of an input URL.
 *
 * @name protocols
 * @function
 *
 * @param {string | URL} input - The input URL.
 * @param {boolean | number} [first] - If `true`, the first protocol wll be returned.
 *                                     If a number, it represents the zero-based index of the protocols array.
 * @return {string | string[]} The array of protocols or the specified protocol.
 */
function protocols(input: string | URL, first?: boolean | number): string | string[] {
    if(first === true) first = 0
    let protocols = ''

    if(typeof input === 'string') {
        try {
            protocols = new URL(input).protocol
        } catch(error) { /* Invalid URL, protocols remains an empty string. */ }
    } else if(input instanceof URL) {
        protocols = input.protocol
    }

    const splits = protocols.split(/:|\+/).filter(Boolean)

    if(typeof first === 'number') return splits[first]
    return splits
}

export default protocols

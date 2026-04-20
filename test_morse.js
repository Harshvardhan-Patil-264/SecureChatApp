const charToMorse = {
  'a': '.-', 'b': '-...', 'c': '-.-.', 'd': '-..', 'e': '.',
  'f': '..-.', 'g': '--.', 'h': '....', 'i': '..', 'j': '.---',
  'k': '-.-', 'l': '.-..', 'm': '--', 'n': '-.', 'o': '---',
  'p': '.--.', 'q': '--.-', 'r': '.-.', 's': '...', 't': '-',
  'u': '..-', 'v': '...-', 'w': '.--', 'x': '-..-', 'y': '-.--',
  'z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.', ' ': '/'
}

const morseToChar = Object.fromEntries(Object.entries(charToMorse).map(([c, m]) => [m, c]))

function toMorse(input) {
  return input.split('').map(ch => charToMorse[ch.toLowerCase()] ?? ch).join(' ')
}

function fromMorse(morse) {
  return morse.trim().split(/\s+/).map(tok => morseToChar[tok] ?? tok).join('')
}

console.log('Test 1:', fromMorse(toMorse("heey")));
console.log('Test 2:', fromMorse(toMorse("hy")));
console.log('Test 3 (with space):', fromMorse(toMorse("heey ")));
console.log('Test 4 (empty):', fromMorse(toMorse("")));

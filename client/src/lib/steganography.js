export function hideTextInImage(imageFile, encryptedText) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        const textBytes = new TextEncoder().encode(encryptedText)
        const lengthBytes = new Uint8Array(4)
        lengthBytes[0] = (textBytes.length >> 24) & 0xFF
        lengthBytes[1] = (textBytes.length >> 16) & 0xFF
        lengthBytes[2] = (textBytes.length >> 8) & 0xFF
        lengthBytes[3] = textBytes.length & 0xFF

        const totalBytes = lengthBytes.length + textBytes.length
        if (totalBytes * 4 > data.length) { reject(new Error('Image too small to hide text')); return }

        let byteIndex = 0
        for (let i = 0; i < lengthBytes.length; i++) {
          const byte = lengthBytes[i]
          for (let bit = 0; bit < 8; bit++) {
            const pixelIndex = byteIndex * 4
            if (pixelIndex >= data.length) break
            const bitValue = (byte >> (7 - bit)) & 1
            data[pixelIndex] = (data[pixelIndex] & 0xFE) | bitValue
            byteIndex++
          }
        }

        for (let i = 0; i < textBytes.length; i++) {
          const byte = textBytes[i]
          for (let bit = 0; bit < 8; bit++) {
            const pixelIndex = byteIndex * 4
            if (pixelIndex >= data.length) break
            const bitValue = (byte >> (7 - bit)) & 1
            data[pixelIndex] = (data[pixelIndex] & 0xFE) | bitValue
            byteIndex++
          }
        }

        ctx.putImageData(imageData, 0, 0)
        const resultBase64 = canvas.toDataURL('image/png')
        resolve(resultBase64)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(imageFile)
  })
}

export function extractTextFromImage(imageBase64) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let byteIndex = 0
      const lengthBytes = new Uint8Array(4)
      for (let i = 0; i < 4; i++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const pixelIndex = byteIndex * 4
          if (pixelIndex >= data.length) { reject(new Error('Invalid steganography data')); return }
          const bitValue = data[pixelIndex] & 1
          byte = (byte << 1) | bitValue
          byteIndex++
        }
        lengthBytes[i] = byte
      }

      const textLength = (lengthBytes[0] << 24) | (lengthBytes[1] << 16) | (lengthBytes[2] << 8) | lengthBytes[3]
      if (textLength <= 0 || textLength > 200000) { reject(new Error('Invalid text length')); return }

      const textBytes = new Uint8Array(textLength)
      for (let i = 0; i < textLength; i++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const pixelIndex = byteIndex * 4
          if (pixelIndex >= data.length) { reject(new Error('Incomplete steganography data')); return }
          const bitValue = data[pixelIndex] & 1
          byte = (byte << 1) | bitValue
          byteIndex++
        }
        textBytes[i] = byte
      }

      const extractedText = new TextDecoder().decode(textBytes)
      resolve(extractedText)
    }
    img.onerror = reject
    img.src = imageBase64
  })
}

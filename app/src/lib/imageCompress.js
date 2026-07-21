import imageCompression from 'browser-image-compression'

export async function compressAvatar(file) {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.03,
    maxWidthOrHeight: 200,
    useWebWorker: true,
  })
  return fileToBase64(compressed)
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

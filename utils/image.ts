import { Jimp } from 'jimp'

import { lazyInitialize } from './memo'

const getJimpInstance = lazyInitialize(() => {
  return Jimp
})

export async function convertImageFileToJpegBase64(file: File) {
  const Jimp = getJimpInstance()
  const jimp = await Jimp.fromBuffer(await file.arrayBuffer())
  const dateUrl = await jimp.scaleToFit({ h: 2048, w: 2048 }).getBase64('image/jpeg')
  const base64Data = dateUrl.split(',')[1] // Remove the data URL prefix
  return base64Data
}

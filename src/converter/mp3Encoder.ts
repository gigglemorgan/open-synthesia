/**
 * mp3Encoder.ts
 * Web Audio Float32 AudioBuffer'dan LAME MP3 formatına dönüştürücü
 */

import lamejs from 'lamejs';

export async function audioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitrate: number = 192,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

  const mp3encoder = new lamejs.Mp3Encoder(numChannels > 1 ? 2 : 1, sampleRate, bitrate);
  const mp3Data: Uint8Array[] = [];

  const sampleBlockSize = 1152; // LAME standard frame size
  const totalBlocks = Math.ceil(length / sampleBlockSize);

  // Convert Float32 to Int16
  const leftChunk = new Int16Array(sampleBlockSize);
  const rightChunk = numChannels > 1 ? new Int16Array(sampleBlockSize) : leftChunk;

  for (let i = 0; i < length; i += sampleBlockSize) {
    const chunkSize = Math.min(sampleBlockSize, length - i);

    for (let j = 0; j < chunkSize; j++) {
      const l = Math.max(-1, Math.min(1, leftChannel[i + j]));
      leftChunk[j] = l < 0 ? l * 0x8000 : l * 0x7FFF;

      if (numChannels > 1) {
        const r = Math.max(-1, Math.min(1, rightChannel[i + j]));
        rightChunk[j] = r < 0 ? r * 0x8000 : r * 0x7FFF;
      }
    }

    let mp3buf: Int8Array;
    if (numChannels > 1) {
      mp3buf = mp3encoder.encodeBuffer(
        chunkSize < sampleBlockSize ? leftChunk.subarray(0, chunkSize) : leftChunk,
        chunkSize < sampleBlockSize ? rightChunk.subarray(0, chunkSize) : rightChunk
      );
    } else {
      mp3buf = mp3encoder.encodeBuffer(
        chunkSize < sampleBlockSize ? leftChunk.subarray(0, chunkSize) : leftChunk
      );
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    if (onProgress && i % (sampleBlockSize * 10) === 0) {
      const blockIndex = Math.floor(i / sampleBlockSize);
      onProgress(Math.round((blockIndex / totalBlocks) * 100));
      // Give UI breathing room
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  onProgress?.(100);

  return new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
}

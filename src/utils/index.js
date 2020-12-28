'use strict';

import crypto from 'crypto';
import stream from 'stream';

/**
 * Checks if an object is a readable stream
 * @param {Object} obj Object to be checked
 * @returns {Boolean} True if is a stream. False if not.
 */
function isReadableStream(obj) {
  return obj instanceof stream.Stream &&
    typeof (obj._read === 'function') &&
    typeof (obj._readableState === 'object');
}

/**
 * Rejects the request.
 * @returns {Promise} error - Returns a Promise with the details for the wrong request.
 */
export function rejectValidation(module, param) {
  return Promise.reject({
    status: 0,
    message: `The ${module} ${param} is not valid or it was not specified properly`
  });
}

export const bodyTypes = {
  BUFFER: 'BUFFER',
  STREAM: 'STREAM',

  /**
   * @param {Object} body - The file body whose type we need to determine
   * @return {string} One of bodyTypes.BUFFER, or null
   */
  get(body) {
    if (Buffer.isBuffer(body)) {
      return bodyTypes.BUFFER;
    }

    if (isReadableStream(body)) {
      return bodyTypes.STREAM;
    }

    return null;
  }
};

/**
 * Returns file size
 * @param {Object} file File
 * @returns {Number} The amount of data that can be read from the file
 */
export function getLength(file) {
  const { body, length } = file;
  const bodyType = bodyTypes.get(body);

  if (bodyType === bodyTypes.BUFFER) {
    return body.length;
  }

  return length;
}

/**
 * Returns a SHA256 hex string of the param file/chunk
 * @param {Buffer} file File buffer
 * @returns {String}
 */
export function create256HexHash(file) {
  return crypto.createHash('sha256')
    .update(file)
    .digest('hex');
}

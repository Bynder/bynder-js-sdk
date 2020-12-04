'use strict';

import crypto from 'crypto';

/**
 * Rejects the request.
 * @return {Promise} error - Returns a Promise with the details for the wrong request.
 */
export function rejectValidation(module, param) {
  return Promise.reject({
    status: 0,
    message: `The ${module} ${param} is not valid or it was not specified properly`
  });
}

export const bodyTypes = {
  BUFFER: 'BUFFER',

  /**
   * @param {Object} body - The file body whose type we need to determine
   * @return {string} One of bodyTypes.BUFFER, or null
   */
  get(body) {
    if (Buffer.isBuffer(body)) {
      return bodyTypes.BUFFER;
    }
    return null;
  }
};

/**
 * Returns file size
 * @param {Object} file File
 * @return {Number} The amount of data that can be read from the file
 */
export function getLength(file) {
  const { body, length } = file;
  const bodyType = bodyTypes.get(body);

  if (bodyType === bodyTypes.BUFFER) {
    return body.length;
  }

  return length;
}

export function create256HexHash(bytes) {
  return crypto.createHash('sha256')
    .update(bytes)
    .digest('hex');
}

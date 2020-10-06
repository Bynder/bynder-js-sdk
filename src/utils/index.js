'use strict';

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
  BLOB: 'BLOB',
  STREAM: 'STREAM',

  /**
   * @param {Object} body - The file body whose type we need to determine
   * @return {string} One of bodyTypes.BUFFER, bodyTypes.BLOB, bodyTypes.STREAM
   */
  get: body => {
    if (Buffer?.isBuffer(body)) {
      return bodyTypes.BUFFER;
    }
    if (window?.Blob && body instanceof window?.Blob) {
      return bodyTypes.BLOB;
    }
    if (typeof body.read === 'function') {
      return bodyTypes.STREAM;
    }
    return null;
  }
};

/**
 * @return {number} length - The amount of data that can be read from the file
 */

export function getLength(file) {
  const { body, length } = file;
  const bodyType = bodyTypes.get(body);
  if (bodyType === bodyTypes.BUFFER) {
    return body.length;
  }
  if (bodyType === bodyTypes.BLOB) {
    return body.size;
  }
  return length;
}

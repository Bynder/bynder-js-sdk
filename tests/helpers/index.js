'use strict';

let mockedFunctions = {};

export function mockFunctions(obj = {}, fns = []) {
  for (let fn of fns) {
    mockedFunctions[fn.name] = jest.spyOn(obj, fn.name);
    const value = fn.returnedValue;

    if (value) {
      mockedFunctions[fn.name].mockImplementation(() => value);
    }
  }
}

export function restoreMockedFunctions(obj = {}, fns = []) { // eslint-disable-line no-unused-vars
  for (let fn of fns) {
    mockedFunctions[fn.name].mockRestore();
    delete mockedFunctions?.[fn.name];
  }
}

export function clearMockedFunctions() {
  mockedFunctions = {};
}

export function mocks() {
  return mockedFunctions;
}

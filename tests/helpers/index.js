'use strict';

let mockedFunctions = {};

export function mockFunctions(obj = {}, fns = []) {
  for (let fn of fns) {
    mockedFunctions[fn.name] = obj[fn.name];

    const value = fn.returnedValue || Promise.resolve();
    obj[fn.name] = jest.fn(() => value);
  }
}

export function restoreMockedFunctions(obj = {}, fns = []) {
  for (let fn of fns) {
    obj[fn.name] = mockedFunctions[fn.name];
    delete mockedFunctions[fn.name];
  }
}

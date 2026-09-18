import mongoose from "mongoose";

/**
 * Detect whether the connected deployment supports multi-document
 * transactions (replica set or mongos). Standalone mongod does not.
 * Result is cached after the first check.
 */
let txSupportPromise = null;

function checkTxSupport() {
  if (!txSupportPromise) {
    txSupportPromise = (async () => {
      try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        // setName → replica set member, msg isdbgrid → mongos
        return !!hello.setName || hello.msg === "isdbgrid";
      } catch {
        return false;
      }
    })();
  }
  return txSupportPromise;
}

/**
 * Run `fn(session)` inside a MongoDB transaction when supported.
 * Falls back to direct execution (session = null) on standalone servers,
 * where the callers' own duplicate-guard checks provide idempotency.
 * Every DB call inside `fn` must pass the session through.
 */
export async function withTransaction(fn) {
  const supported = await checkTxSupport();
  if (!supported) {
    return fn(null);
  }
  const session = await mongoose.connection.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Attach a session to a query when one is active (no-op otherwise).
 * Usage: findOne(Model, filter, session) → Promise
 */
export function findOne(Model, filter, session) {
  const q = Model.findOne(filter);
  if (session) q.session(session);
  return q.exec();
}

export function findById(Model, id, session) {
  const q = Model.findById(id);
  if (session) q.session(session);
  return q.exec();
}

/**
 * Create a document, honoring the session.
 */
export function createDoc(Model, data, session) {
  if (session) {
    return Model.create([data], { session }).then((r) => r[0]);
  }
  return Model.create(data);
}
